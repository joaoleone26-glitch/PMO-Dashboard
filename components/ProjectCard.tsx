'use client';

import { Project } from '@/lib/types';
import { FarolBadge } from './FarolBadge';

interface Props {
  project: Project;
  onClick: () => void;
  selected: boolean;
}

const kpiStatusColor: Record<string, string> = {
  'on-track': 'text-emerald-600',
  'at-risk': 'text-amber-600',
  'off-track': 'text-red-600',
  'unknown': 'text-gray-500',
};

export function ProjectCard({ project, onClick, selected }: Props) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-all duration-150 ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:shadow-sm hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
          <p className="text-xs text-gray-500 truncate">{project.company}</p>
        </div>
        <FarolBadge status={project.farol} />
      </div>

      {project.progress !== undefined && project.progress !== null && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${
                project.progress >= 70 ? 'bg-emerald-500' : project.progress >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(project.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {project.kpis.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {project.kpis.slice(0, 2).map((kpi, i) => (
            <span
              key={i}
              className={`text-xs px-1.5 py-0.5 rounded bg-gray-100 font-medium ${kpiStatusColor[kpi.status]}`}
            >
              {kpi.name}: {kpi.value}{kpi.unit ? ` ${kpi.unit}` : ''}
            </span>
          ))}
          {project.kpis.length > 2 && (
            <span className="text-xs text-gray-400">+{project.kpis.length - 2}</span>
          )}
        </div>
      )}

      {project.attentionPoints.length > 0 && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 truncate">
          ⚠ {project.attentionPoints[0]}
        </div>
      )}
    </div>
  );
}
