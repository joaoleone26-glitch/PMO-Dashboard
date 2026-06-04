import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Project } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic();

function fmt(v: number | null | undefined, b = false): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : b && v > 0 ? '+' : '';
  if (abs >= 1_000_000_000) return `${sign}R$ ${(abs / 1_000_000_000).toFixed(1)}Bi`;
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}Mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}R$ ${Math.round(abs)}`;
}

function buildProjectContext(projects: Project[]) {
  return projects.map(p => {
    const ev = p.ev ?? null;
    const ac = p.ac ?? p.budget?.actual ?? null;
    const pv = p.pv ?? null;
    const bac = p.bac ?? p.budget?.planned ?? null;
    const cpi = ev != null && ac != null && ac > 0 ? ev / ac : null;
    const spi = ev != null && pv != null && pv > 0 ? ev / pv : null;
    const eac = cpi != null && bac != null && cpi > 0 ? bac / cpi : null;
    const eacDevPct = eac != null && bac != null ? ((eac - bac) / bac) * 100 : null;
    const topRisk = p.risks?.slice().sort((a, b) => b.score - a.score)[0];

    return [
      `### ${p.name}`,
      `Farol: ${p.farol} | Fase: ${p.phase ?? '—'} | Gerente: ${p.responsible ?? '—'}`,
      `Progresso: ${p.progress ?? '—'}% | Status: ${p.status ?? '—'}`,
      `SPI: ${spi != null ? spi.toFixed(2) : 'não disponível'} | CPI: ${cpi != null ? cpi.toFixed(2) : 'não disponível'}`,
      `BAC: ${fmt(bac)} | EV: ${fmt(ev)} | AC: ${fmt(ac)}`,
      `EAC: ${fmt(eac)}${eacDevPct != null ? ` (${eacDevPct > 0 ? '+' : ''}${eacDevPct.toFixed(1)}% vs BAC)` : ''}`,
      topRisk ? `Risco principal: ${topRisk.description} (P${topRisk.probability}×I${topRisk.impact}=Score${topRisk.score})` : 'Sem riscos mapeados',
      p.difficulties?.length ? `Dificuldades: ${p.difficulties.join('; ')}` : '',
      p.attentionPoints?.length ? `Pontos de atenção: ${p.attentionPoints.join('; ')}` : '',
      p.scope ? `Escopo: ${p.scope.completedDeliverables ?? '?'}/${p.scope.plannedDeliverables ?? '?'} entregas` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      projects: Project[];
      config: {
        clientName: string;
        period: string;
        preparedBy: string;
        language: 'pt' | 'en';
      };
    };

    const { projects, config } = body;
    if (!projects?.length) {
      return NextResponse.json({ error: 'Nenhum projeto selecionado' }, { status: 400 });
    }

    const projectCtx = buildProjectContext(projects);
    const isPt = config.language !== 'en';
    const lang = isPt ? 'português brasileiro' : 'English';

    const totalProjects = projects.length;
    const onTrackSPI = projects.filter(p => {
      const ev = p.ev ?? null, pv = p.pv ?? null;
      if (ev != null && pv != null && pv > 0) return (ev / pv) >= 0.95;
      return p.farol === 'verde';
    }).length;
    const atRisk = projects.filter(p => p.farol === 'amarelo').length;
    const critical = projects.filter(p => p.farol === 'vermelho').length;

    const systemPrompt = isPt
      ? `Você é um consultor sênior da Porsche Consulting especializado em PMO de infraestrutura.
Gere relatórios executivos precisos, profissionais e objetivos em ${lang}.
Retorne APENAS JSON válido sem markdown.`
      : `You are a senior Porsche Consulting consultant specialized in infrastructure PMO.
Generate precise, professional, and objective executive reports in ${lang}.
Return ONLY valid JSON without markdown.`;

    const userPrompt = `Gere um Status Report executivo de PMO com os dados abaixo.
Cliente: ${config.clientName}
Período: ${config.period}
Preparado por: ${config.preparedBy}
Total de projetos: ${totalProjects} (${onTrackSPI} no prazo, ${atRisk} atenção, ${critical} críticos)

DADOS DOS PROJETOS:
${projectCtx}

Retorne JSON com EXATAMENTE esta estrutura:
{
  "executiveSummary": "2-3 parágrafos narrativos sobre o portfólio. Mencione cliente, quantidade de projetos, performance geral de SPI/CPI, destaques positivos e riscos.",
  "projectStatuses": [
    {
      "name": "nome do projeto",
      "farol": "verde|amarelo|vermelho|cinza",
      "manager": "nome do gerente",
      "progress": 75,
      "spi": 0.96,
      "cpi": 0.98,
      "eacFormatted": "R$ 8,5Mi",
      "eacDevPct": 2.3,
      "bacFormatted": "R$ 8,0Mi",
      "situation": "2-3 linhas sobre situação atual do projeto",
      "mainRisk": "descrição do principal risco identificado",
      "recommendedAction": "ação específica e concreta recomendada"
    }
  ],
  "highlights": {
    "positive": ["item positivo 1", "item positivo 2", "item positivo 3"],
    "attention": ["ponto de atenção 1", "ponto de atenção 2", "ponto de atenção 3"]
  },
  "nextSteps": [
    { "action": "ação concreta", "responsible": "responsável", "deadline": "prazo" },
    { "action": "ação concreta", "responsible": "responsável", "deadline": "prazo" },
    { "action": "ação concreta", "responsible": "responsável", "deadline": "prazo" }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const report = JSON.parse(cleaned);

    return NextResponse.json({ report, config });
  } catch (err) {
    console.error('[report/generate]', err);
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 });
  }
}
