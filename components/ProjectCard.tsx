'use client';

import { Project } from '@/lib/types';
import { FarolBadge } from './FarolBadge';

interface Props {
  project: Project;
  onClick: () => void;
  selected: boolean;
}

export function ProjectCard({ project, onClick, selected }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'rgba(213,0,28,0.06)' : '#111111',
        border: selected ? '1px solid rgba(213,0,28,0.35)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="hover-lift"
    >
      {selected && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#D5001C', borderRadius: '99px 0 0 99px' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </p>
          <p style={{ fontSize: 11, color: '#52525B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {project.company}
          </p>
        </div>
        <FarolBadge status={project.farol} />
      </div>

      {project.progress !== undefined && project.progress !== null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: '#52525B' }}>Progresso</span>
            <span style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>{project.progress}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
            <div style={{
              height: '100%',
              width: `${Math.min(project.progress, 100)}%`,
              borderRadius: 99,
              background: project.progress >= 70 ? '#22C55E' : project.progress >= 40 ? '#F59E0B' : '#D5001C',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {project.attentionPoints.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '4px 8px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 5 }}>
          <span style={{ fontSize: 10, color: '#F59E0B' }}>⚠</span>
          <span style={{ fontSize: 10, color: '#92400E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.attentionPoints[0]}
          </span>
        </div>
      )}
    </div>
  );
}
