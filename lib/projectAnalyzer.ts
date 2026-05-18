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
      "deadline": "data limite se disponível",
      "responsible": "responsável se disponível",
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

  try {
    const parsed = JSON.parse(text);
    const projects: Project[] = (parsed.projects || []).map((p: Project, i: number) => ({
      ...p,
      id: p.id || `proj-${Date.now()}-${i}`,
      lastUpdated: p.lastUpdated || new Date().toISOString(),
      kpis: p.kpis || [],
      difficulties: p.difficulties || [],
      attentionPoints: p.attentionPoints || [],
    }));
    return projects;
  } catch {
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
