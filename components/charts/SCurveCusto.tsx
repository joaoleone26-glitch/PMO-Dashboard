'use client';

import { Project, MonthlyDataPoint } from '@/lib/types';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from 'recharts';

interface ChartPoint {
  month: string;
  pv: number;
  ev: number | null;
  ac: number | null;
}

function deriveFromCostCurve(project: Project): ChartPoint[] | null {
  if (!project.costCurve || project.costCurve.length === 0) return null;
  const bac = project.bac ?? project.budget?.planned ?? 1;
  const prog = (project.progress ?? 0) / 100;
  return project.costCurve.map(pt => ({
    month: pt.month,
    pv: Math.round((pt.planned / 1_000_000) * 100) / 100,
    ev: pt.actual != null
      ? Math.round((pt.planned * prog / 1_000_000) * 100) / 100
      : null,
    ac: pt.actual != null
      ? Math.round((pt.actual / 1_000_000) * 100) / 100
      : null,
  }));
  void bac;
}

function fromMonthlyData(data: MonthlyDataPoint[]): ChartPoint[] {
  return data.map(d => ({
    month: d.month,
    pv: Math.round((d.pv / 1_000_000) * 100) / 100,
    ev: d.ev != null ? Math.round((d.ev / 1_000_000) * 100) / 100 : null,
    ac: d.ac != null ? Math.round((d.ac / 1_000_000) * 100) / 100 : null,
  }));
}

function aggregatePortfolio(projects: Project[]): ChartPoint[] {
  const allPoints = projects.map(p => {
    if (p.monthlyData && p.monthlyData.length > 0) return fromMonthlyData(p.monthlyData);
    return deriveFromCostCurve(p);
  }).filter(Boolean) as ChartPoint[][];

  if (allPoints.length === 0) return [];

  const len = Math.max(...allPoints.map(c => c.length));
  return Array.from({ length: len }, (_, i) => {
    let sumPv = 0, sumEv = 0, sumAc = 0, countEv = 0, countAc = 0;
    let month = '';
    for (const curve of allPoints) {
      const pt = curve[i] ?? curve[curve.length - 1];
      if (!pt) continue;
      sumPv += pt.pv;
      month = month || pt.month;
      if (pt.ev != null) { sumEv += pt.ev; countEv++; }
      if (pt.ac != null) { sumAc += pt.ac; countAc++; }
    }
    return {
      month,
      pv: Math.round(sumPv * 100) / 100,
      ev: countEv > 0 ? Math.round(sumEv * 100) / 100 : null,
      ac: countAc > 0 ? Math.round(sumAc * 100) / 100 : null,
    };
  });
}

const tooltipStyle = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#E4E4E7' };

const NA_MSG = (
  <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 24px', textAlign: 'center' }}>
    <span style={{ fontSize: 22 }}>📊</span>
    <p style={{ fontSize: 11, color: '#52525B', lineHeight: 1.7 }}>
      Curva S indisponível — inclua no arquivo:<br />
      <span style={{ color: '#3F3F46', fontFamily: 'monospace', fontSize: 10 }}>Mês, PV Acumulado, EV Acumulado, AC Acumulado</span>
    </p>
  </div>
);

interface Props { projects: Project[]; height?: number }

export function SCurveCusto({ projects, height = 260 }: Props) {
  if (projects.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#3F3F46', fontSize: 13 }}>Carregue projetos para ver a Curva S</p>
    </div>
  );

  let data: ChartPoint[];
  if (projects.length === 1) {
    const p = projects[0];
    if (p.monthlyData && p.monthlyData.length > 0) {
      data = fromMonthlyData(p.monthlyData);
    } else {
      const derived = deriveFromCostCurve(p);
      if (!derived) return NA_MSG;
      data = derived;
    }
  } else {
    data = aggregatePortfolio(projects);
    if (data.length === 0) return NA_MSG;
  }

  const today = new Date().toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}Mi`} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, name) => {
            if (v == null || v === '') return ['—', name];
            return [`R$ ${Number(v).toFixed(2)}Mi`, name as string];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
        <ReferenceLine x={today} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2"
          label={{ value: 'Hoje', fill: '#52525B', fontSize: 9 }} />
        {/* PV — Planejado (dashed white) */}
        <Line
          type="monotone" dataKey="pv" name="Planejado (PV)"
          stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeDasharray="6 3"
          dot={false} connectNulls
        />
        {/* EV — Valor Entregue (green) */}
        <Line
          type="monotone" dataKey="ev" name="Valor Entregue (EV)"
          stroke="#00B050" strokeWidth={2.5} dot={false} connectNulls
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,176,80,0.5))' }}
        />
        {/* AC — Gasto Real (red) */}
        <Line
          type="monotone" dataKey="ac" name="Gasto Real (AC)"
          stroke="#D5001C" strokeWidth={2.5} dot={false} connectNulls
          style={{ filter: 'drop-shadow(0 0 4px rgba(213,0,28,0.5))' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
