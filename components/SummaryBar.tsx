'use client';

import { Project, FarolStatus } from '@/lib/types';

export function SummaryBar({ projects }: { projects: Project[] }) {
  const counts: Record<FarolStatus, number> = { verde: 0, amarelo: 0, vermelho: 0, cinza: 0 };
  for (const p of projects) counts[p.farol] = (counts[p.farol] || 0) + 1;

  const totalAttention = projects.reduce((sum, p) => sum + p.attentionPoints.length, 0);
  const totalDifficulties = projects.reduce((sum, p) => sum + p.difficulties.length, 0);

  const items = [
    { label: 'Projetos', value: projects.length, color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-200' },
    { label: 'No prazo', value: counts.verde, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    { label: 'Atenção', value: counts.amarelo, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
    { label: 'Críticos', value: counts.vermelho, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
    { label: 'Alertas', value: totalAttention, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    { label: 'Dificuldades', value: totalDifficulties, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {items.map(item => (
        <div key={item.label} className={`rounded-xl border p-3 ${item.bg} ${item.border}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {item.dot && <span className={`w-2 h-2 rounded-full ${item.dot}`} />}
            <span className={`text-xs font-medium text-gray-500`}>{item.label}</span>
          </div>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
