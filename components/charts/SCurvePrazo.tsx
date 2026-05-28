'use client';

import { Project, SCurvePoint } from '@/lib/types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from 'recharts';

function sCurveShape(t: number): number {
  return 100 / (1 + Math.exp(-10 * (t - 0.5)));
}

function generateCurve(project: Project): SCurvePoint[] {
  if (project.scheduleCurve && project.scheduleCurve.length > 0) return project.scheduleCurve;
  const months = 12;
  const progress = project.progress ?? 0;
  const now = new Date();
  const result: SCurvePoint[] = [];
  for (let i = 0; i <= months; i++) {
    const t = i / months;
    const planned = Math.round(sCurveShape(t) * 10) / 10;
    const isActual = i <= Math.round((progress / 100) * months);
    const actual = isActual ? Math.round(sCurveShape(t * (progress / 100 + 0.05)) * 10) / 10 : null;
    const d = new Date(now.getFullYear(), now.getMonth() - Math.round((1 - progress / 100) * months) + i);
    const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    result.push({ month: label, planned, actual });
  }
  return result;
}

function aggregateCurves(projects: Project[]): SCurvePoint[] {
  const curves = projects.map(generateCurve);
  const len = Math.max(...curves.map(c => c.length));
  const result: SCurvePoint[] = [];
  for (let i = 0; i < len; i++) {
    let sumP = 0, sumA = 0, countA = 0;
    const months: string[] = [];
    for (const curve of curves) {
      const pt = curve[i] ?? curve[curve.length - 1];
      if (!pt) continue;
      sumP += pt.planned;
      months.push(pt.month);
      if (pt.actual !== null && pt.actual !== undefined) { sumA += pt.actual; countA++; }
    }
    result.push({
      month: months[0] ?? '',
      planned: Math.round((sumP / curves.length) * 10) / 10,
      actual: countA > 0 ? Math.round((sumA / countA) * 10) / 10 : null,
    });
  }
  return result;
}

const tooltipStyle = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#E4E4E7' };

export function SCurvePrazo({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#3F3F46', fontSize: 13 }}>Carregue projetos para ver a curva S de prazo</p>
    </div>
  );

  const data = projects.length === 1 ? generateCurve(projects[0]) : aggregateCurves(projects);
  const today = new Date().toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="aheadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="behindGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D5001C" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#D5001C" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v != null ? `${v}%` : ""]} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
        <ReferenceLine x={today} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" label={{ value: 'Hoje', fill: '#52525B', fontSize: 9 }} />
        <Line type="monotone" dataKey="planned" name="Previsto" stroke="#52525B" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
        <Line type="monotone" dataKey="actual" name="Realizado" stroke="#D5001C" strokeWidth={2.5} dot={false} connectNulls
          style={{ filter: 'drop-shadow(0 0 4px rgba(213,0,28,0.4))' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
