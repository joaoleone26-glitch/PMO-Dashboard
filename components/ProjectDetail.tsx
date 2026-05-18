'use client';

import { Project } from '@/lib/types';
import { FarolBadge } from './FarolBadge';

const kpiStatusColor: Record<string, string> = {
  'on-track': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'at-risk': 'bg-amber-100 text-amber-800 border-amber-200',
  'off-track': 'bg-red-100 text-red-800 border-red-200',
  'unknown': 'bg-gray-100 text-gray-600 border-gray-200',
};

const kpiStatusLabel: Record<string, string> = {
  'on-track': 'No prazo',
  'at-risk': 'Em risco',
  'off-track': 'Fora do prazo',
  'unknown': 'Desconhecido',
};

export function ProjectDetail({ project }: { project: Project }) {
  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h2 className="text-lg font-bold text-gray-900">{project.name}</h2>
          <FarolBadge status={project.farol} />
        </div>
        <p className="text-sm text-gray-500">{project.company}</p>
        {project.description && (
          <p className="text-sm text-gray-700 mt-2">{project.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {project.status && (
          <div className="col-span-2 bg-gray-50 rounded-lg p-2">
            <span className="text-xs text-gray-500 block">Status</span>
            <span className="font-medium text-gray-800">{project.status}</span>
          </div>
        )}
        {project.progress !== undefined && project.progress !== null && (
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-xs text-gray-500 block">Progresso</span>
            <span className="font-bold text-gray-800 text-lg">{project.progress}%</span>
          </div>
        )}
        {project.deadline && (
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-xs text-gray-500 block">Prazo</span>
            <span className="font-medium text-gray-800">{project.deadline}</span>
          </div>
        )}
        {project.responsible && (
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-xs text-gray-500 block">Responsável</span>
            <span className="font-medium text-gray-800">{project.responsible}</span>
          </div>
        )}
        {project.budget?.planned && (
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-xs text-gray-500 block">Orçamento</span>
            <span className="font-medium text-gray-800">
              {project.budget.currency} {project.budget.planned.toLocaleString('pt-BR')}
            </span>
          </div>
        )}
      </div>

      {/* KPIs */}
      {project.kpis.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">KPIs</h3>
          <div className="space-y-2">
            {project.kpis.map((kpi, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2 ${kpiStatusColor[kpi.status]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{kpi.name}</span>
                  <span className="text-xs font-semibold">
                    {kpi.value}{kpi.unit ? ` ${kpi.unit}` : ''}
                  </span>
                </div>
                {kpi.target && (
                  <div className="text-xs mt-0.5 opacity-75">
                    Meta: {kpi.target}{kpi.unit ? ` ${kpi.unit}` : ''} · {kpiStatusLabel[kpi.status]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Attention Points */}
      {project.attentionPoints.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pontos de Atenção</h3>
          <ul className="space-y-1.5">
            {project.attentionPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Difficulties */}
      {project.difficulties.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dificuldades</h3>
          <ul className="space-y-1.5">
            {project.difficulties.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="mt-0.5 shrink-0">✕</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Team */}
      {project.team && project.team.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time</h3>
          <div className="flex flex-wrap gap-1.5">
            {project.team.map((member, i) => (
              <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">
                {member}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
