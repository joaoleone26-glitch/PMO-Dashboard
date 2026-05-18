'use client';

import { Project } from '@/lib/types';
import { FarolBadge } from './FarolBadge';

const kpiColors: Record<string, { color: string; bg: string; border: string; label: string }> = {
  'on-track':  { color: '#22C55E', bg: 'rgba(34,197,94,0.07)',   border: 'rgba(34,197,94,0.18)',   label: 'No prazo'      },
  'at-risk':   { color: '#F59E0B', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)',  label: 'Em risco'      },
  'off-track': { color: '#D5001C', bg: 'rgba(213,0,28,0.07)',   border: 'rgba(213,0,28,0.18)',    label: 'Fora da meta'  },
  'unknown':   { color: '#6B7280', bg: 'rgba(107,114,128,0.07)',border: 'rgba(107,114,128,0.15)', label: 'Desconhecido'  },
};

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontSize: 10, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#E4E4E7', fontWeight: 500 }}>{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 3, height: 14, background: '#D5001C', borderRadius: 99 }} />
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#71717A', textTransform: 'uppercase', fontWeight: 600 }}>{children}</p>
    </div>
  );
}

export function ProjectDetail({ project }: { project: Project }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>{project.name}</h2>
          <FarolBadge status={project.farol} />
        </div>
        <p style={{ fontSize: 12, color: '#52525B', marginBottom: 8 }}>{project.company}</p>
        {project.description && (
          <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.6 }}>{project.description}</p>
        )}
      </div>

      {/* Meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 24 }}>
        {project.status && <MetaChip label="Status" value={project.status} />}
        {project.progress !== undefined && project.progress !== null && (
          <MetaChip label="Progresso" value={`${project.progress}%`} />
        )}
        {project.deadline && <MetaChip label="Prazo" value={project.deadline} />}
        {project.responsible && <MetaChip label="Responsável" value={project.responsible} />}
        {project.budget?.planned && (
          <MetaChip
            label="Orçamento Planejado"
            value={`${project.budget.currency || 'R$'} ${project.budget.planned.toLocaleString('pt-BR')}`}
          />
        )}
        {project.budget?.actual && (
          <MetaChip
            label="Orçamento Realizado"
            value={`${project.budget.currency || 'R$'} ${project.budget.actual.toLocaleString('pt-BR')}`}
          />
        )}
      </div>

      {/* KPIs */}
      {project.kpis.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>KPIs</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.kpis.map((kpi, i) => {
              const c = kpiColors[kpi.status] || kpiColors.unknown;
              return (
                <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#E4E4E7' }}>{kpi.name}</p>
                    {kpi.target && (
                      <p style={{ fontSize: 10, color: '#71717A', marginTop: 2 }}>
                        Meta: {kpi.target}{kpi.unit ? ` ${kpi.unit}` : ''} · {c.label}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: c.color, whiteSpace: 'nowrap' }}>
                    {kpi.value}{kpi.unit ? ` ${kpi.unit}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attention Points */}
      {project.attentionPoints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>Pontos de Atenção</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.attentionPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 8 }}>
                <span style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }}>⚠</span>
                <span style={{ fontSize: 13, color: '#D97706', lineHeight: 1.5 }}>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Difficulties */}
      {project.difficulties.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>Dificuldades</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.difficulties.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(213,0,28,0.06)', border: '1px solid rgba(213,0,28,0.18)', borderRadius: 8 }}>
                <span style={{ color: '#D5001C', flexShrink: 0, marginTop: 1, fontSize: 12 }}>✕</span>
                <span style={{ fontSize: 13, color: '#F87171', lineHeight: 1.5 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {project.team && project.team.length > 0 && (
        <div>
          <SectionTitle>Time</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {project.team.map((m, i) => (
              <span key={i} style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, color: '#A1A1AA' }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
