import Anthropic from '@anthropic-ai/sdk';
import { Project } from './types';

const client = new Anthropic();

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
      "ev": valor ganho (Earned Value) em R$ se disponível ou null,
      "pv": valor planejado (Planned Value) em R$ se disponível ou null,
      "ac": custo real (Actual Cost) em R$ se disponível ou null,
      "riskProbability": 1-5 (probabilidade do risco principal),
      "riskImpact": 1-5 (impacto do risco principal),
      "scheduleCurve": [
        { "month": "Jan/24", "planned": 0-100, "actual": 0-100 ou null se futuro }
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

Regras para riskProbability e riskImpact:
- vermelho → probabilidade 4-5, impacto 4-5
- amarelo → probabilidade 2-4, impacto 2-4
- verde → probabilidade 1-2, impacto 1-2
- cinza → probabilidade 2, impacto 2

Se o documento contiver múltiplos projetos, extraia todos. Se não tiver dados suficientes para um campo, use null ou array vazio.
Retorne APENAS o JSON, sem explicações ou markdown.`;

export async function extractProjectsFromText(rawText: string, fileName: string): Promise<Project[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Arquivo: ${fileName}\n\nConteúdo:\n${rawText.slice(0, 15000)}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log(`[analyzer] Resposta do Claude: ${text.length} chars, stop_reason=${response.stop_reason}`);
  console.log(`[analyzer] Preview da resposta (500 chars): ${text.slice(0, 500)}`);

  try {
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    const projects: Project[] = (parsed.projects || []).map((p: Project, i: number) => ({
      ...p,
      id: p.id || `proj-${Date.now()}-${i}`,
      lastUpdated: p.lastUpdated || new Date().toISOString(),
      kpis: p.kpis || [],
      difficulties: p.difficulties || [],
      attentionPoints: p.attentionPoints || [],
    }));
    return projects;
  } catch (parseErr) {
    console.error('[analyzer] ERRO ao fazer JSON.parse da resposta do Claude:', parseErr);
    console.error('[analyzer] Resposta completa que falhou no parse:', text);
    return [];
  }
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
