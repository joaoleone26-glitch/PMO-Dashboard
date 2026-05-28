'use client';

import { Project } from '@/lib/types';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from 'recharts';

interface PrazoPoint {
  month: string;
  pv: number;
  ev: number | null;
}

function sCurveShape(t: number): number {
  return 100 / (1 + Math.exp(-10 * (t - 0.5)));
}

function generateCurve(project: Project): PrazoPoint[] | null {
  if (project.scheduleCurve && project.scheduleCurve.length > 0) {
    return project.scheduleCurve.map(pt => ({
      month: pt.month,
      pv: Math.round(pt.planned * 10) / 10,
      ev: pt.actual != null ? Math.round(pt.actual * 10) / 10 : null,
    }));
  }
  if (project.monthlyData && project.monthlyData.length > 0) {
    const bac = project.bac ?? project.budget?.planned;
    if (!bac) return null;
    return project.monthlyData.map(d => ({
      month: d.month,
      pv: Math.round((d.pv / bac) * 1000) / 10,
      ev: d.ev != null ? Math.round((d.ev / bac) * 1000) / 10 : null,
    }));
  }
  return null;
}

function generateSynthetic(project: Project): PrazoPoint[] {
  const months = 12;
  const progress = project.progress ?? 0;
  const now = new Date();
  const result: PrazoPoint[] = [];
  for (let i = 0; i <= months; i++) {
    const t = i / months;
    const pv = Math.round(sCurveShape(t) * 10) / 10;
    const isActual = i <= Math.round((progress / 100) * months);
    const ev = isActual ? Math.round(sCurveShape(t * (progress / 100 + 0.05)) * 10) / 10 : null;
    const d = new Date(now.getFullYear(), now.getMonth() - Math.round((1 - progress / 100) * months) + i);
    const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    result.push({ month: label, pv, ev });
  }
  return result;
}

function aggregateCurves(projects: Project[]): PrazoPoint[] {
  const curves = projects.map(p => generateCurve(p) ?? generateSynthetic(p));
  const len = Math.max(...curves.map(c => c.length));
  return Array.from({ length: len }, (_, i) => {
    let sumPv = 0, sumEv = 0, countEv = 0;
    let month = '';
    for (const curve of curves) {
      const pt = curve[i] ?? curve[curve.length - 1];
      if (!pt) continue;
      sumPv += pt.pv;
      month = month || pt.month;
      if (pt.ev != null) { sumEv += pt.ev; countEv++; }
    }
    return {
      month,
      pv: Math.round((sumPv / curves.length) * 10) / 10,
      ev: countEv > 0 ? Math.round((sumEv / countEv) * 10) / 10 : null,
    };
  });
}

const tooltipStyle = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#E4E4E7' };

interface Props { projects: Project[]; height?: number }

export function SCurvePrazo({ projects, height = 260 }: Props) {
  if (projects.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#3F3F46', fontSize: 13 }}>Carregue projetos para ver a curva S de prazo</p>
    </div>
  );

  const data = projects.length === 1
    ? (generateCurve(projects[0]) ?? generateSynthetic(projects[0]))
    : aggregateCurves(projects);

  const today = new Date().toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [v != null ? `${v}%` : '—', name as string]} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
        <ReferenceLine x={today} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2"
          label={{ value: 'Hoje', fill: '#52525B', fontSize: 9 }} />
        <Line type="monotone" dataKey="pv" name="Planejado (PV%)"
          stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
        <Line type="monotone" dataKey="ev" name="Realizado (EV%)"
          stroke="#00B050" strokeWidth={2.5} dot={false} connectNulls
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,176,80,0.4))' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
