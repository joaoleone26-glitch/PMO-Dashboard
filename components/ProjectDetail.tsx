'use client';

import dynamic from 'next/dynamic';
import { Project } from '@/lib/types';
import { FarolBadge } from './FarolBadge';
import { formatCurrency } from '@/lib/formatCurrency';

const SCurveCusto = dynamic(() => import('./charts/SCurveCusto').then(m => m.SCurveCusto), { ssr: false });

function NA() {
  return (
    <span style={{
      fontSize: 10, color: '#52525B',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 99, padding: '2px 9px',
    }}>Não disponível</span>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontSize: 10, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
      <div style={{ fontSize: 13, color: '#E4E4E7', fontWeight: 500 }}>
        {value ? value : <NA />}
      </div>
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

function StatusChip({ value, label, colorFn }: { value: number; label: string; colorFn: (v: number) => string }) {
  const color = colorFn(value);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: `${color}18`, border: `1px solid ${color}33`, color,
    }}>{label}</span>
  );
}

function indexColor(v: number, good: boolean): string {
  if (good) return v >= 0.95 ? '#22C55E' : v >= 0.85 ? '#F59E0B' : '#D5001C';
  return v <= 0 ? '#22C55E' : v <= 0.1 ? '#F59E0B' : '#D5001C';
}

export function ProjectDetail({ project }: { project: Project }) {
  // ── EVM calculations ──────────────────────────────────────────────────────
  const ev = project.ev ?? null;
  const ac = project.ac ?? project.budget?.actual ?? null;
  const pv = project.pv ?? null;
  const bac = project.bac ?? project.budget?.planned ?? null;
  const cpi = ev != null && ac != null && ac > 0 ? ev / ac : null;
  const spi = ev != null && pv != null && pv > 0 ? ev / pv : null;
  const eac = cpi != null && bac != null && cpi > 0 ? bac / cpi : null;
  const eacDev = eac != null && bac != null ? eac - bac : null;
  const eacDevPct = eacDev != null && bac != null ? (eacDev / bac) * 100 : null;

  // ── Risk summary ──────────────────────────────────────────────────────────
  let rCritical = 0, rHigh = 0, rMedium = 0, rLow = 0;
  if (project.risks) {
    for (const r of project.risks) {
      const score = r.score;
      if (score >= 21) rCritical++;
      else if (score >= 15) rHigh++;
      else if (score >= 6) rMedium++;
      else rLow++;
    }
  }

  // ── Scope ─────────────────────────────────────────────────────────────────
  const scope = project.scope;

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>{project.name}</h2>
          <FarolBadge status={project.farol} />
        </div>
        <p style={{ fontSize: 12, color: '#52525B', marginBottom: 6 }}>{project.company}</p>
        {project.description && (
          <p style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.6 }}>{project.description}</p>
        )}
      </div>

      {/* Standardized field grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
        <Field label="Gerente / Responsável" value={project.responsible} />
        <Field label="Fase" value={project.phase} />
        <Field label="% Conclusão" value={project.progress != null ? `${project.progress}%` : null} />
        <Field label="Status" value={project.status} />
        <Field label="Início" value={project.startDate} />
        <Field label="Prazo" value={project.deadline} />
      </div>

      {/* EVM Indices row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ fontSize: 10, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>SPI</p>
          {spi != null
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: indexColor(spi, true) }}>{spi.toFixed(2)}</span>
                <StatusChip value={spi} label={spi >= 0.95 ? 'No prazo' : spi >= 0.85 ? 'Atenção' : 'Crítico'} colorFn={v => indexColor(v, true)} />
              </div>
            : <NA />}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ fontSize: 10, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>CPI</p>
          {cpi != null
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: indexColor(cpi, true) }}>{cpi.toFixed(2)}</span>
                <StatusChip value={cpi} label={cpi >= 0.95 ? 'No orçamento' : cpi >= 0.85 ? 'Atenção' : 'Estouro'} colorFn={v => indexColor(v, true)} />
              </div>
            : <NA />}
        </div>
      </div>

      {/* Budget / EAC */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>CAPEX / EVM</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <Field label="BAC (Orçamento Total)" value={bac != null ? formatCurrency(bac) : null} />
          <Field label="AC (Custo Real)" value={ac != null ? formatCurrency(ac) : null} />
          <Field label="EV (Valor Entregue)" value={ev != null ? formatCurrency(ev) : null} />
          <Field label="PV (Valor Planejado)" value={pv != null ? formatCurrency(pv) : null} />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', gridColumn: 'span 2' }}>
            <p style={{ fontSize: 10, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              EAC (Estimativa no Término) = BAC / CPI
            </p>
            {eac != null
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#E4E4E7' }}>{formatCurrency(eac)}</span>
                  {eacDev != null && eacDevPct != null && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: indexColor(eacDevPct / 100, false),
                    }}>
                      {eacDev >= 0 ? '+' : ''}{formatCurrency(Math.abs(eacDev))} ({eacDev >= 0 ? '+' : ''}{eacDevPct.toFixed(1)}% vs BAC)
                    </span>
                  )}
                </div>
              : <NA />}
          </div>
        </div>
      </div>

      {/* Scope */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Escopo</SectionTitle>
        {scope ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {scope.plannedDeliverables != null && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px' }}>
                <p style={{ fontSize: 10, color: '#52525B', marginBottom: 3 }}>Entregas</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>
                  {scope.completedDeliverables ?? '?'}/{scope.plannedDeliverables}
                </span>
              </div>
            )}
            {scope.approvedChanges != null && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px' }}>
                <p style={{ fontSize: 10, color: '#52525B', marginBottom: 3 }}>Mudanças aprovadas</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>
                  {scope.approvedChanges}{scope.approvedChangesValue != null ? ` · +${formatCurrency(scope.approvedChangesValue)}` : ''}
                </span>
              </div>
            )}
            {scope.scopeCreepPct != null && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px' }}>
                <p style={{ fontSize: 10, color: '#52525B', marginBottom: 3 }}>Scope creep</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: scope.scopeCreepPct > 10 ? '#D5001C' : scope.scopeCreepPct > 0 ? '#F59E0B' : '#22C55E' }}>
                  {scope.scopeCreepPct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 11, color: '#3F3F46', fontStyle: 'italic' }}>Dados de escopo não disponíveis</p>
        )}
      </div>

      {/* Risk summary */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Riscos</SectionTitle>
        {project.risks && project.risks.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {rCritical > 0 && <span style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(127,29,29,0.3)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 99, color: '#F87171' }}>{rCritical} crítico{rCritical !== 1 ? 's' : ''}</span>}
              {rHigh > 0 && <span style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(213,0,28,0.1)', border: '1px solid rgba(213,0,28,0.3)', borderRadius: 99, color: '#D5001C' }}>{rHigh} alto{rHigh !== 1 ? 's' : ''}</span>}
              {rMedium > 0 && <span style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99, color: '#F59E0B' }}>{rMedium} médio{rMedium !== 1 ? 's' : ''}</span>}
              {rLow > 0 && <span style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99, color: '#22C55E' }}>{rLow} baixo{rLow !== 1 ? 's' : ''}</span>}
            </div>
            {project.risks.slice(0, 3).map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: '#A1A1AA', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: '#D4D4D8' }}>P{r.probability}×I{r.impact}={r.score}</span> — {r.description}
              </div>
            ))}
          </>
        ) : (
          <span style={{ fontSize: 11, color: '#52525B', fontStyle: 'italic' }}>Riscos não mapeados</span>
        )}
      </div>

      {/* Mini S-Curve */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Curva S — Custo (PV / EV / AC)</SectionTitle>
        <SCurveCusto projects={[project]} height={200} />
      </div>

      {/* Attention Points */}
      {project.attentionPoints.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>Pontos de Atenção</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.attentionPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 8 }}>
                <span style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }}>⚠</span>
                <span style={{ fontSize: 12, color: '#D97706', lineHeight: 1.5 }}>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Difficulties */}
      {project.difficulties.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>Dificuldades</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.difficulties.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(213,0,28,0.06)', border: '1px solid rgba(213,0,28,0.18)', borderRadius: 8 }}>
                <span style={{ color: '#D5001C', flexShrink: 0, marginTop: 1, fontSize: 12 }}>✕</span>
                <span style={{ fontSize: 12, color: '#F87171', lineHeight: 1.5 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      {project.kpis.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>KPIs Adicionais</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.kpis.map((kpi, i) => {
              const colors: Record<string, string> = { 'on-track': '#22C55E', 'at-risk': '#F59E0B', 'off-track': '#D5001C', 'unknown': '#6B7280' };
              const c = colors[kpi.status] ?? colors.unknown;
              return (
                <div key={i} style={{ background: `${c}10`, border: `1px solid ${c}22`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#E4E4E7' }}>{kpi.name}</p>
                    {kpi.target && <p style={{ fontSize: 10, color: '#71717A', marginTop: 2 }}>Meta: {kpi.target}{kpi.unit ? ` ${kpi.unit}` : ''}</p>}
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: c, whiteSpace: 'nowrap' }}>
                    {kpi.value}{kpi.unit ? ` ${kpi.unit}` : ''}
                  </span>
                </div>
              );
            })}
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
