'use client';

import { Project } from '@/lib/types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from 'recharts';

interface CostPoint { month: string; planned: number; actual: number | null }

function sCurve(t: number) { return 1 / (1 + Math.exp(-10 * (t - 0.5))); }

function generateCostCurve(project: Project): CostPoint[] {
  if (project.costCurve && project.costCurve.length > 0) {
    return project.costCurve.map(pt => ({ month: pt.month, planned: pt.planned, actual: pt.actual }));
  }
  const budget = project.budget?.planned ?? 0;
  const actual = project.budget?.actual ?? 0;
  const progress = project.progress ?? 0;
  const months = 12;
  const now = new Date();
  return Array.from({ length: months + 1 }, (_, i) => {
    const t = i / months;
    const planned = Math.round(sCurve(t) * budget / 1_000_000 * 100) / 100;
    const isActual = i <= Math.round((progress / 100) * months);
    const act = isActual ? Math.round(sCurve(t * (progress / 100 + 0.05)) * actual / 1_000_000 * 100) / 100 : null;
    const d = new Date(now.getFullYear(), now.getMonth() - Math.round((1 - progress / 100) * months) + i);
    const month = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    return { month, planned, actual: act };
  });
}

function aggregateCosts(projects: Project[]): CostPoint[] {
  const curves = projects.map(generateCostCurve);
  const len = Math.max(...curves.map(c => c.length));
  return Array.from({ length: len }, (_, i) => {
    let sumP = 0, sumA = 0, countA = 0;
    let month = '';
    for (const curve of curves) {
      const pt = curve[i] ?? curve[curve.length - 1];
      if (!pt) continue;
      sumP += pt.planned;
      month = pt.month;
      if (pt.actual !== null && pt.actual !== undefined) { sumA += pt.actual; countA++; }
    }
    return { month, planned: Math.round(sumP * 100) / 100, actual: countA > 0 ? Math.round(sumA * 100) / 100 : null };
  });
}

const tooltipStyle = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#E4E4E7' };

export function SCurveCusto({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#3F3F46', fontSize: 13 }}>Carregue projetos para ver a curva S de custo</p>
    </div>
  );

  const data = projects.length === 1 ? generateCostCurve(projects[0]) : aggregateCosts(projects);
  const today = new Date().toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}M`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v != null ? `R$ ${Number(v).toFixed(2)}M` : ""]} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
        <ReferenceLine x={today} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" label={{ value: 'Hoje', fill: '#52525B', fontSize: 9 }} />
        <Line type="monotone" dataKey="planned" name="Previsto" stroke="#52525B" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
        <Line type="monotone" dataKey="actual" name="Realizado" stroke="#60A5FA" strokeWidth={2.5} dot={false} connectNulls
          style={{ filter: 'drop-shadow(0 0 4px rgba(96,165,250,0.4))' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
