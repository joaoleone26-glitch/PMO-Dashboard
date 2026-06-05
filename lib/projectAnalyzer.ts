import Anthropic from '@anthropic-ai/sdk';
import { Project, FileExtraction, ConsolidatedProject } from './types';

const client = new Anthropic();

const CHUNK_SIZE = 12000;
const CHUNK_OVERLAP = 1000;

// ─── Shared intelligent prompt ────────────────────────────────────────────────

const SINGLE_SYSTEM_PROMPT = `Você é um analista sênior de PMO com 20 anos de experiência.

Você já leu milhares de relatórios em formatos completamente diferentes.
Sua habilidade principal é ENTENDER O CONTEXTO e extrair informações
independente de como estão formatadas — não seguir um formulário fixo.

Para CADA campo extraído, indique:
- value: o valor encontrado
- confidence: 'high' (dado explícito), 'medium' (inferido), 'low' (incerto)
- reasoning: explicação em português do seu raciocínio

Use julgamento contextual para TODOS os campos:
- Não existe lista fixa de palavras válidas
- 'Delayed', 'Behind', 'Paralisado', 'Em risco' → farol vermelho ou amarelo pelo contexto
- 'Budget Total', 'CAPEX', 'Orçamento Aprovado' → todos podem ser 'bac'
- Qualquer idioma, emoji, código interno, abreviação — interprete pelo contexto
- NUNCA invente dados. Se não encontrou → não inclua o campo

Campos que você pode extrair:
name, company, responsible, phase, status, farol, progress,
startDate, deadline, description, bac, ev, ac, pv,
monthlyData, risks, difficulties, attentionPoints, scope, team,
knowledgeArea, riskProbability, riskImpact`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitIntoChunks(text: string): string[] {
  if (text.length <= 15000) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

function countFilledFields(p: Project): number {
  let count = 0;
  const check = (v: unknown) => {
    if (v != null && v !== '' && (!Array.isArray(v) || v.length > 0)) count++;
  };
  check(p.name); check(p.company); check(p.farol); check(p.description); check(p.status);
  check(p.progress); check(p.startDate); check(p.deadline); check(p.responsible);
  check(p.phase); check(p.knowledgeArea); check(p.bac); check(p.ev); check(p.pv); check(p.ac);
  check(p.risks); check(p.scope); check(p.monthlyData); check(p.kpis);
  check(p.difficulties); check(p.attentionPoints);
  return count;
}

function mergeProjectChunks(allChunks: Project[][]): Project[] {
  const byName = new Map<string, Project>();
  for (const chunk of allChunks) {
    for (const project of chunk) {
      const key = (project.name ?? '').toLowerCase().trim();
      if (!key) continue;
      const existing = byName.get(key);
      if (!existing || countFilledFields(project) > countFilledFields(existing)) {
        byName.set(key, project);
      }
    }
  }
  return Array.from(byName.values());
}

function parseJSON(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  return JSON.parse(cleaned);
}

// ─── Flow 1: extractProjectsFromText (manual upload) ─────────────────────────
// Uses SINGLE_SYSTEM_PROMPT, asks Claude for Project[] JSON.
// Handles chunks for large files and merges duplicates by name.

const FLOW1_TASK = `Sua tarefa agora: extrair e normalizar dados de projetos deste documento.

Retorne APENAS JSON válido neste formato (sem markdown):
{
  "projects": [
    {
      "id": "proj-único",
      "name": "nome",
      "company": "empresa",
      "farol": "verde|amarelo|vermelho|cinza",
      "description": "descrição",
      "status": "status atual",
      "progress": 0-100,
      "startDate": "ISO 8601 ou null",
      "deadline": "ISO 8601 ou null",
      "responsible": "nome ou null",
      "phase": "Iniciação|Planejamento|Execução|Monitoramento|Encerramento",
      "knowledgeArea": "Escopo|Prazo|Custo|Qualidade|Riscos|RH|Comunicações|Aquisições|Partes Interessadas|Integração",
      "kpis": [{"name":"","value":"","unit":"","target":"","status":"on-track|at-risk|off-track|unknown"}],
      "difficulties": [],
      "attentionPoints": [],
      "budget": {"planned": null, "actual": null, "currency": "BRL"},
      "bac": null,
      "ev": null,
      "pv": null,
      "ac": null,
      "riskProbability": 1-5,
      "riskImpact": 1-5,
      "risks": [{"description":"","probability":1,"impact":1,"score":1,"response":"","responsible":""}],
      "scope": {"plannedDeliverables":null,"completedDeliverables":null,"approvedChanges":null,"approvedChangesValue":null,"scopeCreepPct":null},
      "monthlyData": [{"month":"Jan/24","pv":0,"ev":null,"ac":null}],
      "team": [],
      "lastUpdated": "ISO 8601"
    }
  ]
}

Se o documento tiver múltiplos projetos, extraia todos.
Para campos ausentes use null ou array vazio — nunca omita campos obrigatórios.`;

async function extractProjectsChunk(text: string, fileName: string, chunkLabel: string): Promise<Project[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SINGLE_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Arquivo: ${fileName}${chunkLabel}\n\n${FLOW1_TASK}\n\nConteúdo:\n${text}`,
    }],
  });

  const text2 = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log(`[analyzer:flow1] stop_reason=${response.stop_reason} preview=${text2.slice(0, 120)}`);

  try {
    const parsed = parseJSON(text2) as { projects?: Project[] };
    return (parsed.projects ?? []).map((p: Project, i: number) => ({
      ...p,
      id: p.id || `proj-${Date.now()}-${i}`,
      lastUpdated: p.lastUpdated || new Date().toISOString(),
      kpis: p.kpis || [],
      difficulties: p.difficulties || [],
      attentionPoints: p.attentionPoints || [],
    }));
  } catch {
    console.error('[analyzer:flow1] JSON parse failed, response was:', text2.slice(0, 400));
    return [];
  }
}

export async function extractProjectsFromText(
  rawText: string,
  fileName: string,
  onProgress?: (message: string) => void,
): Promise<Project[]> {
  const chunks = splitIntoChunks(rawText);

  if (chunks.length === 1) {
    return extractProjectsChunk(chunks[0], fileName, '');
  }

  console.log(`[analyzer:flow1] ${rawText.length} chars → ${chunks.length} chunks`);
  const allResults: Project[][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const msg = `Processando parte ${i + 1} de ${chunks.length}...`;
    onProgress?.(msg);
    console.log(`[analyzer:flow1] ${msg}`);
    const projects = await extractProjectsChunk(
      chunks[i], fileName, ` (parte ${i + 1} de ${chunks.length})`,
    );
    allResults.push(projects);
  }

  const merged = mergeProjectChunks(allResults);
  console.log(`[analyzer:flow1] merge: ${merged.length} projetos únicos`);
  return merged;
}

// ─── Flow 2: extractFieldsFromFile (Drive folder consolidation) ───────────────
// Uses SINGLE_SYSTEM_PROMPT, asks Claude for fields[] JSON with confidence+reasoning.
// Handles chunks for large files, merges field results across chunks.
// fileModifiedDate comes from the Drive API — used for conflict resolution.

const FLOW2_TASK = `Sua tarefa agora: extrair campos deste arquivo específico.
Este arquivo faz parte de um projeto maior — outros arquivos serão analisados separadamente.

Extraia APENAS os campos presentes neste arquivo.
Para cada campo, indique confidence e reasoning.

Retorne APENAS JSON válido neste formato (sem markdown):
{
  "fields": [
    {
      "fieldName": "name",
      "value": "Modernização SCADA",
      "confidence": "high",
      "reasoning": "Nome declarado explicitamente no título do TAP"
    }
  ]
}`;

function mergeFieldChunks(allChunks: FileExtraction['fields'][]): FileExtraction['fields'] {
  // For each fieldName keep the entry with highest confidence (tie: keep first)
  const confRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const byField = new Map<string, FileExtraction['fields'][number]>();

  for (const chunk of allChunks) {
    for (const field of chunk) {
      const existing = byField.get(field.fieldName);
      if (!existing || (confRank[field.confidence] ?? 1) < (confRank[existing.confidence] ?? 1)) {
        byField.set(field.fieldName, field);
      }
    }
  }

  return Array.from(byField.values());
}

export async function extractFieldsFromFile(
  rawText: string,
  fileName: string,
  filePath: string,
  fileModifiedDate: string,
): Promise<FileExtraction> {
  console.log(`[analyzer:flow2] ${fileName} (${rawText.length} chars)`);

  const chunks = splitIntoChunks(rawText);
  const allFieldChunks: FileExtraction['fields'][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkLabel = chunks.length > 1 ? ` (parte ${i + 1} de ${chunks.length})` : '';
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SINGLE_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Arquivo: ${fileName}${chunkLabel}\nCaminho: ${filePath}\n\n${FLOW2_TASK}\n\nConteúdo:\n${chunks[i]}`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = parseJSON(text) as { fields?: FileExtraction['fields'] };
      allFieldChunks.push(parsed.fields ?? []);
    } catch (err) {
      console.error(`[analyzer:flow2] chunk ${i + 1} error for ${fileName}:`, err);
      allFieldChunks.push([]);
    }
  }

  return {
    fileName,
    filePath,
    fileDate: fileModifiedDate,
    fields: chunks.length === 1 ? (allFieldChunks[0] ?? []) : mergeFieldChunks(allFieldChunks),
  };
}

// ─── consolidateProjectFiles ──────────────────────────────────────────────────

const ALL_PMO_FIELDS = [
  'name', 'company', 'responsible', 'phase', 'status', 'farol', 'progress',
  'startDate', 'deadline', 'description', 'bac', 'ev', 'ac', 'pv',
  'monthlyData', 'risks', 'difficulties', 'attentionPoints', 'scope', 'team',
];

export function consolidateProjectFiles(extractions: FileExtraction[]): ConsolidatedProject {
  type Entry = { value: unknown; confidence: string; reasoning: string; source: string; fileDate: string };
  const fieldMap = new Map<string, Entry[]>();

  for (const extraction of extractions) {
    for (const field of extraction.fields) {
      if (!fieldMap.has(field.fieldName)) fieldMap.set(field.fieldName, []);
      fieldMap.get(field.fieldName)!.push({
        value: field.value,
        confidence: field.confidence,
        reasoning: field.reasoning,
        source: extraction.fileName,
        fileDate: extraction.fileDate,
      });
    }
  }

  const confirmed: ConsolidatedProject['confirmed'] = [];
  const conflicts: ConsolidatedProject['conflicts'] = [];
  const needsReview: ConsolidatedProject['needsReview'] = [];

  for (const [fieldName, entries] of fieldMap) {
    if (entries.length === 1) {
      const e = entries[0];
      if (e.confidence === 'high') {
        confirmed.push({ fieldName, value: e.value, source: e.source, reasoning: e.reasoning });
      } else {
        needsReview.push({ fieldName, value: e.value, source: e.source, confidence: e.confidence as 'medium' | 'low', reasoning: e.reasoning });
      }
      continue;
    }

    const allSame = entries.every(e => JSON.stringify(e.value) === JSON.stringify(entries[0].value));
    if (allSame) {
      const confRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const best = [...entries].sort((a, b) =>
        (confRank[a.confidence] ?? 1) - (confRank[b.confidence] ?? 1) ||
        new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime()
      )[0];
      if (best.confidence === 'high') {
        confirmed.push({ fieldName, value: best.value, source: best.source, reasoning: best.reasoning });
      } else {
        needsReview.push({ fieldName, value: best.value, source: best.source, confidence: best.confidence as 'medium' | 'low', reasoning: best.reasoning });
      }
    } else {
      const sorted = [...entries].sort((a, b) =>
        new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime()
      );
      conflicts.push({
        fieldName,
        options: sorted.map((e, i) => ({
          value: e.value,
          source: e.source,
          fileDate: e.fileDate,
          reasoning: e.reasoning,
          recommended: i === 0,
        })),
      });
    }
  }

  const foundFields = new Set(fieldMap.keys());
  const missing = ALL_PMO_FIELDS.filter(f => !foundFields.has(f));

  const nameConfirmed = confirmed.find(c => c.fieldName === 'name');
  const nameConflict = conflicts.find(c => c.fieldName === 'name');
  const projectName =
    (nameConfirmed?.value as string | undefined) ??
    (nameConflict?.options.find(o => o.recommended)?.value as string | undefined);

  return {
    confirmed,
    conflicts,
    missing,
    needsReview,
    projectName,
    sourceFiles: extractions.map(e => e.fileName),
  };
}

// ─── chatWithProjects ─────────────────────────────────────────────────────────

export async function chatWithProjects(
  userMessage: string,
  projects: Project[],
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const projectContext = JSON.stringify(projects, null, 2);

  const systemPrompt = `Você é um assistente especializado em PMO (Project Management Office) de infraestrutura.
Você tem acesso aos dados dos projetos e responde perguntas sobre eles de forma clara, objetiva e em português.

Dados dos projetos disponíveis:
${projectContext.slice(0, 20000)}

Ao responder:
- Seja direto e objetivo
- Use bullets e formatação quando ajudar a clareza
- Destaque faróis (🟢 verde, 🟡 amarelo, 🔴 vermelho)
- Priorize informações acionáveis
- Se perguntarem sobre KPIs, dificuldades ou pontos de atenção, seja específico
- Se não tiver a informação, diga claramente`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [...history, { role: 'user' as const, content: userMessage }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
