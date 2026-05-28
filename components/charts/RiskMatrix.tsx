'use client';

import { Project } from '@/lib/types';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface RiskPoint {
  x: number; y: number; name: string; id: string;
  farol: string; color: string;
}

function farolToRisk(p: Project): { prob: number; impact: number } {
  if (p.riskProbability && p.riskImpact) return { prob: p.riskProbability, impact: p.riskImpact };
  const map = { vermelho: { prob: 4.5, impact: 4 }, amarelo: { prob: 3, impact: 3 }, verde: { prob: 1.5, impact: 2 }, cinza: { prob: 2, impact: 1.5 } };
  const base = map[p.farol] ?? map.cinza;
  // small jitter so overlapping dots don't stack
  return { prob: base.prob + (Math.random() - 0.5) * 0.4, impact: base.impact + (Math.random() - 0.5) * 0.4 };
}

const farolColor = { verde: '#22C55E', amarelo: '#F59E0B', vermelho: '#D5001C', cinza: '#4B5563' };

const BG_ZONES = [
  // [x1,y1,x2,y2, color]
  [1, 1, 3, 3, 'rgba(34,197,94,0.06)'],
  [3, 1, 5, 3, 'rgba(245,158,11,0.06)'],
  [1, 3, 3, 5, 'rgba(245,158,11,0.06)'],
  [3, 3, 5, 5, 'rgba(213,0,28,0.06)'],
];

function CustomDot(props: { cx?: number; cy?: number; payload?: RiskPoint; onClick?: (p: RiskPoint) => void }) {
  const { cx = 0, cy = 0, payload, onClick } = props;
  if (!payload) return null;
  return (
    <g onClick={() => onClick?.(payload)} style={{ cursor: 'pointer' }}>
      <circle cx={cx} cy={cy} r={10} fill={payload.color} opacity={0.85}
        style={{ filter: `drop-shadow(0 0 5px ${payload.color}88)`, transition: 'r 0.15s ease' }} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">
        {payload.name.slice(0, 2)}
      </text>
    </g>
  );
}

const tooltipStyle = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#E4E4E7' };

export function RiskMatrix({ projects, onSelectProject }: { projects: Project[]; onSelectProject?: (id: string) => void }) {
  if (projects.length === 0) return (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#3F3F46', fontSize: 13 }}>Carregue projetos para ver a matriz de riscos</p>
    </div>
  );

  const data: RiskPoint[] = projects.map(p => {
    const { prob, impact } = farolToRisk(p);
    return { x: prob, y: impact, name: p.name, id: p.id, farol: p.farol, color: farolColor[p.farol] ?? '#4B5563' };
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Axis labels */}
      <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Impacto →
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" dataKey="x" name="Probabilidade" domain={[0.5, 5.5]}
            ticks={[1, 2, 3, 4, 5]} tickFormatter={v => ['', 'Baixa', 'Mod.', 'Alta', 'Muito Alta', 'Certa'][v] ?? v}
            tick={{ fill: '#52525B', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis type="number" dataKey="y" name="Impacto" domain={[0.5, 5.5]}
            ticks={[1, 2, 3, 4, 5]} tickFormatter={v => ['', 'Baixo', 'Mod.', 'Alto', 'Crítico', 'Catast.'][v] ?? v}
            tick={{ fill: '#52525B', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            content={({ payload }) => {
              const pt = payload?.[0]?.payload as RiskPoint | undefined;
              if (!pt) return null;
              return (
                <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                  <p style={{ fontWeight: 600, color: pt.color, marginBottom: 4 }}>{pt.name}</p>
                  <p>Probabilidade: {pt.x.toFixed(1)}</p>
                  <p>Impacto: {pt.y.toFixed(1)}</p>
                  <p style={{ fontSize: 10, color: '#52525B', marginTop: 4 }}>Clique para ver detalhes</p>
                </div>
              );
            }}
          />
          <Scatter data={data} shape={(props) => <CustomDot {...props} onClick={(pt) => onSelectProject?.(pt.id)} />}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 4 }}>
        {[['#22C55E', 'Baixo'], ['#F59E0B', 'Médio'], ['#D5001C', 'Alto/Crítico']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 4px ${color}88` }} />
            <span style={{ fontSize: 10, color: '#71717A' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
