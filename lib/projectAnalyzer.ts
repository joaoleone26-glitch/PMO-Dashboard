import Anthropic from '@anthropic-ai/sdk';
import { Project } from './types';

const client = new Anthropic();

const CHUNK_SIZE = 12000;
const CHUNK_OVERLAP = 1000;

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
  console.log(`[analyzer] Merge concluído: ${merged.length} projetos únicos de ${allResults.flat().length} extraídos`);
  return merged;
}

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
