'use client';

import { ProjectFilters, ProjectPhase, KnowledgeArea } from '@/lib/types';

const PHASES: ProjectPhase[] = ['Iniciação', 'Planejamento', 'Execução', 'Monitoramento', 'Encerramento'];
const KNOWLEDGE_AREAS: KnowledgeArea[] = [
  'Escopo', 'Prazo', 'Custo', 'Qualidade', 'Riscos',
  'RH', 'Comunicações', 'Aquisições', 'Partes Interessadas', 'Integração',
];

function Checkbox({ checked, onChange, label, color }: { checked: boolean; onChange: () => void; label: string; color?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '2px 0' }}>
      <span style={{
        width: 13, height: 13, borderRadius: 3, flexShrink: 0,
        background: checked ? (color ?? '#D5001C') : 'transparent',
        border: `1.5px solid ${checked ? (color ?? '#D5001C') : 'rgba(255,255,255,0.18)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease',
        boxShadow: checked ? `0 0 5px ${(color ?? '#D5001C')}55` : 'none',
      }}>
        {checked && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 3.5l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span style={{ fontSize: 11, color: checked ? '#E4E4E7' : '#71717A', transition: 'color 0.15s ease' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    </label>
  );
}

function Section({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.14em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600 }}>{title}</p>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: 9, color: '#D5001C', background: 'rgba(213,0,28,0.1)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 99, padding: '1px 5px', fontWeight: 700 }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

interface Props {
  filters: ProjectFilters;
  onChange: (f: ProjectFilters) => void;
  onReset: () => void;
}

export function FilterPanel({ filters, onChange, onReset }: Props) {
  const togglePhase = (phase: ProjectPhase) => {
    const phases = filters.phases.includes(phase)
      ? filters.phases.filter(p => p !== phase)
      : [...filters.phases, phase];
    onChange({ ...filters, phases });
  };
  const toggleArea = (area: KnowledgeArea) => {
    const areas = filters.knowledgeAreas.includes(area)
      ? filters.knowledgeAreas.filter(a => a !== area)
      : [...filters.knowledgeAreas, area];
    onChange({ ...filters, knowledgeAreas: areas });
  };
  const activeCount = (filters.farol !== 'all' ? 1 : 0) + filters.phases.length + filters.knowledgeAreas.length + (filters.dateStart ? 1 : 0);

  const farolOptions: { key: ProjectFilters['farol']; label: string; color: string }[] = [
    { key: 'all', label: 'Todos', color: '#A1A1AA' },
    { key: 'verde', label: 'Verde', color: '#22C55E' },
    { key: 'amarelo', label: 'Amarelo', color: '#F59E0B' },
    { key: 'vermelho', label: 'Vermelho', color: '#D5001C' },
  ];

  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600 }}>
          Filtros
        </p>
        {activeCount > 0 && (
          <button onClick={onReset} style={{ fontSize: 10, color: '#D5001C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Limpar ({activeCount})
          </button>
        )}
      </div>

      <Section title="Farol">
        <div style={{ display: 'flex', gap: 5 }}>
          {farolOptions.map(f => (
            <button key={f.key} onClick={() => onChange({ ...filters, farol: f.key })}
              style={{
                flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 6, cursor: 'pointer',
                background: filters.farol === f.key ? `${f.color}22` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filters.farol === f.key ? f.color + '66' : 'rgba(255,255,255,0.07)'}`,
                color: filters.farol === f.key ? f.color : '#52525B',
                fontWeight: filters.farol === f.key ? 700 : 400, transition: 'all 0.15s ease',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Fase" count={filters.phases.length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {PHASES.map(p => (
            <Checkbox key={p} label={p} checked={filters.phases.includes(p)} onChange={() => togglePhase(p)} />
          ))}
        </div>
      </Section>

      <Section title="Período">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="month" value={filters.dateStart}
            onChange={e => onChange({ ...filters, dateStart: e.target.value })}
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: '#E4E4E7', fontSize: 10, outline: 'none' }} />
          <span style={{ fontSize: 10, color: '#52525B' }}>até</span>
          <input type="month" value={filters.dateEnd}
            onChange={e => onChange({ ...filters, dateEnd: e.target.value })}
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: '#E4E4E7', fontSize: 10, outline: 'none' }} />
        </div>
      </Section>

      <Section title="Área de Conhecimento" count={filters.knowledgeAreas.length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {KNOWLEDGE_AREAS.map(a => (
            <Checkbox key={a} label={a} checked={filters.knowledgeAreas.includes(a)} onChange={() => toggleArea(a)} />
          ))}
        </div>
      </Section>
    </div>
  );
}
