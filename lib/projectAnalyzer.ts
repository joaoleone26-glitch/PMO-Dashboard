import Anthropic from '@anthropic-ai/sdk';
import { Project, FileExtraction, ConsolidatedProject } from './types';

const client = new Anthropic();

const CHUNK_SIZE = 12000;
const CHUNK_OVERLAP = 1000;

// ─── Multi-project extraction (existing flow) ────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Você é um analista especializado em PMO (Project Management Office) de infraestrutura.
Sua tarefa é extrair e normalizar dados de projetos de documentos que podem vir em vários formatos (CSV, Excel, JSON, PDF, Word, texto livre).

Sempre retorne um JSON válido com um array de projetos. Cada projeto deve seguir exatamente esta estrutura:

{
  "projects": [
    {
      "id": "string único gerado",
      "name": "nome do projeto",
      "company": "empresa ou área responsável",
      "farol": "verde | amarelo | vermelho | cinza",
      "description": "descrição breve do projeto",
      "status": "descrição do status atual",
      "progress": 0-100 (percentual, número),
      "startDate": "data de início se disponível (ISO 8601)",
      "deadline": "data limite se disponível (ISO 8601)",
      "responsible": "responsável se disponível",
      "phase": "Iniciação | Planejamento | Execução | Monitoramento | Encerramento",
      "knowledgeArea": "Escopo | Prazo | Custo | Qualidade | Riscos | RH | Comunicações | Aquisições | Partes Interessadas | Integração",
      "kpis": [
        {
          "name": "nome do indicador",
          "value": "valor atual",
          "unit": "unidade se aplicável",
          "target": "meta se disponível",
          "status": "on-track | at-risk | off-track | unknown"
        }
      ],
      "difficulties": ["dificuldade 1", "dificuldade 2"],
      "attentionPoints": ["ponto de atenção 1", "ponto de atenção 2"],
      "budget": {
        "planned": número ou null,
        "actual": número ou null,
        "currency": "BRL | USD | EUR"
      },
      "bac": orçamento original total (Budget at Completion) em R$ ou null,
      "ev": Earned Value acumulado total em R$ se disponível ou null,
      "pv": Planned Value acumulado atual em R$ se disponível ou null,
      "ac": Actual Cost acumulado total em R$ se disponível ou null,
      "riskProbability": 1-5 (probabilidade do risco principal),
      "riskImpact": 1-5 (impacto do risco principal),
      "risks": [
        {
          "description": "descrição do risco",
          "probability": 1-5,
          "impact": 1-5,
          "score": probabilidade * impacto (1-25),
          "response": "plano de resposta se disponível",
          "responsible": "responsável pelo risco se disponível"
        }
      ],
      "scope": {
        "plannedDeliverables": número total de entregas planejadas ou null,
        "completedDeliverables": número de entregas concluídas ou null,
        "approvedChanges": número de mudanças aprovadas ou null,
        "approvedChangesValue": valor total de mudanças aprovadas em R$ ou null,
        "scopeCreepPct": percentual de scope creep acumulado ou null
      },
      "scheduleCurve": [
        { "month": "Jan/24", "planned": 0-100, "actual": 0-100 ou null se futuro }
      ],
      "monthlyData": [
        {
          "month": "Jan/24",
          "pv": valor planejado acumulado em R$ até esse mês,
          "ev": earned value acumulado em R$ ou null se futuro,
          "ac": custo real acumulado em R$ ou null se futuro
        }
      ],
      "costCurve": [
        { "month": "Jan/24", "planned": valor acumulado em R$, "actual": valor acumulado em R$ ou null se futuro }
      ],
      "team": ["membro 1", "membro 2"],
      "lastUpdated": "data de atualização ou data atual"
    }
  ]
}

Regras para o farol:
- verde: projeto saudável, dentro do prazo e orçamento
- amarelo: riscos moderados, atenção necessária
- vermelho: problemas críticos, ação imediata necessária
- cinza: status desconhecido ou sem dados suficientes

Regras para riskProbability e riskImpact (risco principal/representativo do projeto):
- vermelho → probabilidade 4-5, impacto 4-5
- amarelo → probabilidade 2-4, impacto 2-4
- verde → probabilidade 1-2, impacto 1-2
- cinza → probabilidade 2, impacto 2

Extraia TODOS os riscos identificados no documento para o array "risks". Para cada risco, calcule score = probability * impact.
Extraia dados de escopo (entregas, mudanças) quando disponíveis.
Se houver dados mensais de PV/EV/AC, preencha "monthlyData" com valores acumulados.
Se o documento contiver múltiplos projetos, extraia todos. Se não tiver dados suficientes para um campo, use null ou array vazio.
Retorne APENAS o JSON, sem explicações ou markdown.`;

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

function parseProjectsFromText(text: string): Project[] {
  console.log(`[analyzer] Resposta do Claude: ${text.length} chars`);
  try {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    return (parsed.projects || []).map((p: Project, i: number) => ({
      ...p,
      id: p.id || `proj-${Date.now()}-${i}`,
      lastUpdated: p.lastUpdated || new Date().toISOString(),
      kpis: p.kpis || [],
      difficulties: p.difficulties || [],
      attentionPoints: p.attentionPoints || [],
    }));
  } catch (parseErr) {
    console.error('[analyzer] ERRO ao fazer JSON.parse da resposta do Claude:', parseErr);
    return [];
  }
}

async function extractChunk(text: string, fileName: string, chunkLabel: string): Promise<Project[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Arquivo: ${fileName}${chunkLabel}\n\nConteúdo:\n${text}` }],
  });
  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log(`[analyzer] stop_reason=${response.stop_reason}, preview: ${responseText.slice(0, 200)}`);
  return parseProjectsFromText(responseText);
}

export async function extractProjectsFromText(
  rawText: string,
  fileName: string,
  onProgress?: (message: string) => void,
): Promise<Project[]> {
  const chunks = splitIntoChunks(rawText);

  if (chunks.length === 1) {
    return extractChunk(chunks[0], fileName, '');
  }

  console.log(`[analyzer] Texto grande (${rawText.length} chars) → ${chunks.length} chunks`);
  const allResults: Project[][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const msg = `Processando parte ${i + 1} de ${chunks.length}...`;
    onProgress?.(msg);
    console.log(`[analyzer] ${msg}`);
    const projects = await extractChunk(chunks[i], fileName, ` (parte ${i + 1} de ${chunks.length})`);
    allResults.push(projects);
  }

  const merged = mergeProjectChunks(allResults);
  console.log(`[analyzer] Merge concluído: ${merged.length} projetos únicos`);
  return merged;
}

// ─── Single-file field extraction (consolidation flow) ───────────────────────

const FILE_EXTRACTION_SYSTEM_PROMPT = `Você é um analista sênior de PMO com 20 anos de experiência.
Você está lendo UM arquivo específico que faz parte de um projeto maior.
Outros arquivos do mesmo projeto serão lidos separadamente.

Sua missão neste arquivo:
1. Entenda o tipo e contexto do documento
2. Extraia APENAS os campos que existem neste arquivo
3. NÃO invente campos que não estão aqui
4. Para cada campo extraído, indique o valor, confiança e raciocínio em português

Use julgamento contextual para TODOS os campos:
- Não existe lista fixa de palavras válidas — interprete pelo contexto
- Se não tiver certeza → confidence: "low"
- Se genuinamente não encontrou → não inclua o campo

Campos que você pode extrair se presentes:
- name: nome do projeto
- company: empresa ou área
- responsible: gerente ou responsável
- phase: fase (Iniciação/Planejamento/Execução/Monitoramento/Encerramento)
- status: descrição do status atual
- farol: saúde geral (verde/amarelo/vermelho/cinza)
- progress: percentual de conclusão (número 0-100)
- startDate: data de início (ISO 8601)
- deadline: data de término prevista (ISO 8601)
- description: descrição do projeto
- bac: orçamento total aprovado em R$ (número)
- ev: earned value acumulado em R$ (número)
- ac: custo real acumulado em R$ (número)
- pv: planned value acumulado em R$ (número)
- monthlyData: array de dados mensais {month, pv, ev, ac}
- risks: array de riscos {description, probability(1-5), impact(1-5), score, response}
- difficulties: array de strings com dificuldades
- attentionPoints: array de strings com pontos de atenção
- scope: objeto {plannedDeliverables, completedDeliverables, approvedChanges, scopeCreepPct}
- team: array de nomes dos membros da equipe
- knowledgeArea: área de conhecimento PMBOK
- riskProbability: 1-5 (risco principal)
- riskImpact: 1-5 (risco principal)

Retorne APENAS JSON válido neste formato exato:
{
  "fields": [
    {
      "fieldName": "name",
      "value": "Modernização SCADA",
      "confidence": "high",
      "reasoning": "Nome explicitamente declarado no título do documento TAP"
    }
  ]
}

Sem markdown, sem explicações fora do JSON.`;

export async function extractFieldsFromFile(
  rawText: string,
  fileName: string,
  filePath: string,
): Promise<FileExtraction> {
  console.log(`[analyzer] extractFieldsFromFile: ${fileName} (${rawText.length} chars)`);
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: FILE_EXTRACTION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Arquivo: ${fileName}\nCaminho: ${filePath}\n\nConteúdo:\n${rawText.slice(0, 12000)}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      fileName,
      filePath,
      fileDate: new Date().toISOString(),
      fields: parsed.fields ?? [],
    };
  } catch (err) {
    console.error(`[analyzer] extractFieldsFromFile error for ${fileName}:`, err);
    return { fileName, filePath, fileDate: new Date().toISOString(), fields: [] };
  }
}

// ─── Consolidation logic ─────────────────────────────────────────────────────

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
      // Sort by date descending; mark the newest as recommended
      const sorted = [...entries].sort((a, b) =>
        new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime()
      );
      const newestDate = sorted[0].fileDate;
      conflicts.push({
        fieldName,
        options: sorted.map(e => ({
          value: e.value,
          source: e.source,
          fileDate: e.fileDate,
          reasoning: e.reasoning,
          recommended: e.fileDate === newestDate && e === sorted[0],
        })),
      });
    }
  }

  const foundFields = new Set(fieldMap.keys());
  const missing = ALL_PMO_FIELDS.filter(f => !foundFields.has(f));

  const nameConfirmed = confirmed.find(c => c.fieldName === 'name');
  const nameConflict = conflicts.find(c => c.fieldName === 'name');
  const projectName = (nameConfirmed?.value as string) ??
    (nameConflict?.options.find(o => o.recommended)?.value as string) ??
    undefined;

  return {
    confirmed,
    conflicts,
    missing,
    needsReview,
    projectName,
    sourceFiles: extractions.map(e => e.fileName),
  };
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export async function chatWithProjects(
  userMessage: string,
  projects: Project[],
  history: Array<{ role: 'user' | 'assistant'; content: string }>
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

  const messages = [
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
