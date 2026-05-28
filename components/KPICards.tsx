'use client';

import { useState } from 'react';
import { Project, Risk } from '@/lib/types';
import { formatCurrency } from '@/lib/formatCurrency';

// ─── Risk helpers ────────────────────────────────────────────────────────────

function getRiskCategory(score: number): { label: string; color: string } {
  if (score >= 21) return { label: 'Crítico', color: '#1a0a0a' };
  if (score >= 15) return { label: 'Alto', color: '#D5001C' };
  if (score >= 6)  return { label: 'Médio', color: '#F59E0B' };
  return { label: 'Baixo', color: '#22C55E' };
}

function getRiskCellColor(prob: number, impact: number): string {
  const score = prob * impact;
  if (score >= 21) return 'rgba(90,0,0,0.7)';
  if (score >= 15) return 'rgba(213,0,28,0.35)';
  if (score >= 6)  return 'rgba(245,158,11,0.3)';
  return 'rgba(34,197,94,0.2)';
}

// ─── SPI helpers ─────────────────────────────────────────────────────────────

function projectSPI(p: Project): { spi: number | null; estimated: boolean } {
  const ev = p.ev;
  const pv = p.pv;
  if (ev != null && pv != null && pv > 0) return { spi: ev / pv, estimated: false };
  // estimate from progress + dates
  const budget = p.budget?.planned;
  const prog = p.progress ?? 0;
  const evEst = budget ? budget * (prog / 100) : null;
  let pvEst: number | null = null;
  if (budget && p.deadline && p.startDate) {
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.deadline).getTime();
    const elapsed = Math.max(0, Math.min(1, (Date.now() - start) / (end - start)));
    pvEst = budget * elapsed;
  }
  if (evEst != null && pvEst != null && pvEst > 0) return { spi: evEst / pvEst, estimated: true };
  return { spi: null, estimated: false };
}

function projectCPI(p: Project): number | null {
  const ev = p.ev;
  const ac = p.ac ?? p.budget?.actual;
  if (ev != null && ac != null && ac > 0) return ev / ac;
  return null;
}

function spiColor(spi: number): string {
  return spi >= 0.95 ? '#22C55E' : spi >= 0.85 ? '#F59E0B' : '#D5001C';
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TrendArrow({ value }: { value: number }) {
  const up = value >= 1;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }}>
      <path d={up ? 'M7 2l5 8H2z' : 'M7 12L2 4h10z'} fill={up ? '#22C55E' : '#D5001C'} />
    </svg>
  );
}

function GaugeArc({ score, color }: { score: number; color: string }) {
  const r = 34, cx = 52, cy = 52;
  const startAngle = -200, sweep = 220;
  const pct = Math.min(score / 10, 1);
  const toRad = (d: number) => (d * Math.PI) / 180;
  const ax = (a: number) => cx + r * Math.cos(toRad(a));
  const ay = (a: number) => cy + r * Math.sin(toRad(a));
  const endAngle = startAngle + sweep * pct;
  const bgEnd = startAngle + sweep;
  return (
    <svg width="104" height="80" viewBox="0 0 104 80">
      <path d={`M ${ax(startAngle)} ${ay(startAngle)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ax(bgEnd)} ${ay(bgEnd)}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${ax(startAngle)} ${ay(startAngle)} A ${r} ${r} 0 ${sweep * pct > 180 ? 1 : 0} 1 ${ax(endAngle)} ${ay(endAngle)}`}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'all 0.8s ease' }} />
      )}
      <text x={cx} y={cy + 6} textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">{score.toFixed(1)}</text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill="#52525B" fontSize="9">/10</text>
    </svg>
  );
}

// ─── Drawer wrapper ───────────────────────────────────────────────────────────

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 580,
        background: '#111111', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>{title}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ─── SPI Drill-down ───────────────────────────────────────────────────────────

function SPIDrawer({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const rows = projects.map(p => {
    const { spi, estimated } = projectSPI(p);
    const schedDays = spi != null && p.deadline && p.startDate
      ? Math.round((1 - spi) * (new Date(p.deadline).getTime() - new Date(p.startDate).getTime()) / 86400000)
      : null;
    return { p, spi, estimated, schedDays };
  }).sort((a, b) => (a.spi ?? 999) - (b.spi ?? 999));

  return (
    <Drawer title="Desempenho de Prazo por Projeto" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ p, spi, estimated, schedDays }) => {
          const color = spi != null ? spiColor(spi) : '#52525B';
          const barPct = spi != null ? Math.min(100, Math.max(0, spi * 100)) : 0;
          return (
            <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#E4E4E7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  {estimated && <p style={{ fontSize: 9, color: '#F59E0B', marginTop: 1 }}>⚠️ SPI estimado — forneça PV mensal para cálculo preciso</p>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color }}>{spi != null ? spi.toFixed(2) : '—'}</span>
                  {schedDays != null && (
                    <p style={{ fontSize: 10, color: schedDays > 0 ? '#D5001C' : '#22C55E' }}>
                      {schedDays > 0 ? `+${schedDays}d atraso` : schedDays < 0 ? `${Math.abs(schedDays)}d adiantado` : 'No prazo'}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease', boxShadow: `0 0 6px ${color}66` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: '#3F3F46' }}>0</span>
                <span style={{ fontSize: 9, color: '#3F3F46' }}>SPI 1.0</span>
              </div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

// ─── CPI Drill-down ───────────────────────────────────────────────────────────

function CPIDrawer({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const rows = projects.map(p => {
    const cpi = projectCPI(p);
    const ev = p.ev ?? null;
    const ac = p.ac ?? p.budget?.actual ?? null;
    const dev = ev != null && ac != null ? ev - ac : null;
    return { p, cpi, ev, ac, dev };
  }).sort((a, b) => (a.cpi ?? 999) - (b.cpi ?? 999));

  return (
    <Drawer title="Desempenho de Custo por Projeto" onClose={onClose}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Projeto', 'CPI', 'EV', 'AC', 'Desvio'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Projeto' ? 'left' : 'right', color: '#52525B', fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, cpi, ev, ac, dev }) => {
              const color = cpi != null ? spiColor(cpi) : '#52525B';
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 10px', color: '#D4D4D8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color }}>
                    {cpi != null ? cpi.toFixed(2) : <span style={{ color: '#52525B' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#A1A1AA' }}>
                    {ev != null ? formatCurrency(ev) : <span style={{ color: '#3F3F46' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#A1A1AA' }}>
                    {ac != null ? formatCurrency(ac) : <span style={{ color: '#3F3F46' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>
                    {dev != null
                      ? <span style={{ color: dev >= 0 ? '#22C55E' : '#D5001C' }}>{dev >= 0 ? '+' : ''}{formatCurrency(dev)}</span>
                      : <span style={{ color: '#3F3F46' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}

// ─── Risk Drill-down ─────────────────────────────────────────────────────────

function RiskDrawer({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const [hovered, setHovered] = useState<Risk & { projectName: string } | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // Collect all risks across projects
  const allRisks: (Risk & { projectName: string; projectId: string })[] = [];
  for (const p of projects) {
    if (p.risks && p.risks.length > 0) {
      for (const r of p.risks) allRisks.push({ ...r, projectName: p.name, projectId: p.id });
    }
  }
  const sorted = [...allRisks].sort((a, b) => b.score - a.score);

  // Grid cell size
  const CELL = 52;

  return (
    <Drawer title="Matriz de Riscos do Portfólio (PMBOK 5×5)" onClose={onClose}>
      {/* PMBOK 5×5 Grid */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Y axis label */}
          <div style={{ position: 'absolute', left: -36, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 9, color: '#52525B', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Probabilidade →
          </div>
          <div style={{ marginLeft: 8 }}>
            {/* Grid */}
            <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(prob => (
                <div key={prob} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <span style={{ width: 28, fontSize: 9, color: '#52525B', textAlign: 'right', paddingRight: 6, flexShrink: 0 }}>
                    {['', 'Baixa', 'Mod.', 'Alta', 'M.Alta', 'Certa'][prob]}
                  </span>
                  {[1, 2, 3, 4, 5].map(impact => {
                    const score = prob * impact;
                    const bg = getRiskCellColor(prob, impact);
                    const risksHere = allRisks.filter(r => r.probability === prob && r.impact === impact);
                    return (
                      <div
                        key={impact}
                        style={{
                          width: CELL, height: CELL, background: bg,
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 4, position: 'relative',
                          display: 'flex', flexWrap: 'wrap', gap: 2,
                          padding: 4, alignContent: 'flex-start',
                        }}
                      >
                        <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>{score}</span>
                        {risksHere.slice(0, 4).map((r, i) => {
                          const { color } = getRiskCategory(r.score);
                          return (
                            <div
                              key={i}
                              style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: color === '#1a0a0a' ? '#7f1d1d' : color,
                                border: '1px solid rgba(255,255,255,0.3)',
                                cursor: 'pointer', flexShrink: 0,
                                boxShadow: `0 0 4px ${color === '#1a0a0a' ? '#D5001C' : color}88`,
                              }}
                              onMouseEnter={(e) => {
                                setHovered({ ...r });
                                setPopupPos({ x: e.clientX, y: e.clientY });
                              }}
                              onMouseLeave={() => setHovered(null)}
                            />
                          );
                        })}
                        {risksHere.length > 4 && (
                          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>+{risksHere.length - 4}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {/* X axis labels */}
            <div style={{ display: 'flex', marginLeft: 34, gap: 2, marginTop: 4 }}>
              {['Baixo', 'Mod.', 'Alto', 'Crítico', 'Catast.'].map(l => (
                <div key={l} style={{ width: CELL, fontSize: 8, color: '#52525B', textAlign: 'center' }}>{l}</div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 4, fontSize: 9, color: '#52525B', letterSpacing: '0.1em' }}>IMPACTO →</p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { score: 4, label: 'Baixo (1-5)', color: '#22C55E' },
            { score: 10, label: 'Médio (6-14)', color: '#F59E0B' },
            { score: 18, label: 'Alto (15-20)', color: '#D5001C' },
            { score: 24, label: 'Crítico (21-25)', color: '#7f1d1d' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 4px ${color}88` }} />
              <span style={{ fontSize: 9, color: '#71717A' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Projects with no risks mapped */}
      {projects.filter(p => !p.risks || p.risks.length === 0).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: '#3F3F46', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Riscos não mapeados</p>
          {projects.filter(p => !p.risks || p.risks.length === 0).map(p => (
            <span key={p.id} style={{ display: 'inline-block', fontSize: 10, color: '#52525B', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 10px', marginRight: 6, marginBottom: 4 }}>
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Sorted risk table */}
      {sorted.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Todos os riscos — score decrescente</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.map((r, i) => {
              const { label, color } = getRiskCategory(r.score);
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                      background: `${color}18`, border: `1px solid ${color}44`,
                      color: color === '#1a0a0a' ? '#F87171' : color,
                    }}>{label} {r.score}</span>
                    <span style={{ fontSize: 9, color: '#52525B' }}>{r.projectName}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: '#3F3F46' }}>P{r.probability} × I{r.impact}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#D4D4D8', lineHeight: 1.5 }}>{r.description}</p>
                  {r.response && <p style={{ fontSize: 10, color: '#71717A', marginTop: 4 }}>↳ {r.response}</p>}
                  {r.responsible && <p style={{ fontSize: 10, color: '#52525B', marginTop: 2 }}>👤 {r.responsible}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hover popup */}
      {hovered && (
        <div style={{
          position: 'fixed', left: popupPos.x + 12, top: popupPos.y - 10,
          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '10px 14px', zIndex: 1100,
          maxWidth: 260, pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#E4E4E7', marginBottom: 4 }}>{hovered.description}</p>
          <p style={{ fontSize: 10, color: '#71717A' }}>{hovered.projectName}</p>
          {hovered.response && <p style={{ fontSize: 10, color: '#A1A1AA', marginTop: 6 }}>↳ {hovered.response}</p>}
          {hovered.responsible && <p style={{ fontSize: 10, color: '#52525B', marginTop: 3 }}>👤 {hovered.responsible}</p>}
        </div>
      )}
    </Drawer>
  );
}

// ─── Main KPICards ─────────────────────────────────────────────────────────────

const cardBase: React.CSSProperties = {
  background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
  padding: '22px 24px', position: 'relative', overflow: 'hidden',
  transition: 'border-color 0.18s ease, transform 0.18s ease',
  cursor: 'pointer',
};
const deco = <div style={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle, rgba(213,0,28,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />;

type DrawerType = 'spi' | 'cpi' | 'risk' | null;

export function KPICards({ projects }: { projects: Project[] }) {
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);
  const total = projects.length;

  // ── SPI ──────────────────────────────────────────────────────────────────
  let sumEV = 0, sumPV = 0, spiN = 0, spiEstimated = false;
  for (const p of projects) {
    const { spi: s, estimated } = projectSPI(p);
    if (s != null) {
      const ev = p.ev ?? (p.budget?.planned ? p.budget.planned * ((p.progress ?? 0) / 100) : 0);
      const pv = p.pv ?? (p.budget?.planned && p.deadline && p.startDate
        ? p.budget.planned * Math.max(0, Math.min(1, (Date.now() - new Date(p.startDate).getTime()) / (new Date(p.deadline).getTime() - new Date(p.startDate).getTime())))
        : 0);
      sumEV += ev; sumPV += pv; spiN++;
      if (estimated) spiEstimated = true;
    }
  }
  const spi = spiN > 0 && sumPV > 0 ? sumEV / sumPV : null;
  const spiColorVal = spi === null ? '#52525B' : spiColor(spi);

  // ── CPI ──────────────────────────────────────────────────────────────────
  let sumAC = 0, cpiEV = 0, cpiN = 0;
  for (const p of projects) {
    const ac = p.ac ?? p.budget?.actual;
    const ev = p.ev;
    if (ev != null && ac != null && ac > 0) { cpiEV += ev; sumAC += ac; cpiN++; }
  }
  const cpi = cpiN > 0 && sumAC > 0 ? cpiEV / sumAC : null;
  const cpiColorVal = cpi === null ? '#52525B' : spiColor(cpi);
  const cpiDev = cpiN > 0 ? cpiEV - sumAC : null;

  // ── Risk (PMBOK 5×5) ──────────────────────────────────────────────────────
  let critical = 0, high = 0, medium = 0, low = 0;
  let totalCapex = 0, weightedScore = 0;
  for (const p of projects) {
    const capex = p.bac ?? p.budget?.planned ?? 1;
    if (p.risks && p.risks.length > 0) {
      const avgScore = p.risks.reduce((s, r) => s + r.score, 0) / p.risks.length;
      weightedScore += avgScore * capex;
      totalCapex += capex;
      for (const r of p.risks) {
        const cat = getRiskCategory(r.score);
        if (cat.label === 'Crítico') critical++;
        else if (cat.label === 'Alto') high++;
        else if (cat.label === 'Médio') medium++;
        else low++;
      }
    } else {
      // fallback to farol if no risks
      const score = p.farol === 'vermelho' ? 16 : p.farol === 'amarelo' ? 8 : p.farol === 'verde' ? 3 : 4;
      weightedScore += score * capex;
      totalCapex += capex;
    }
  }
  const riskIndex = totalCapex > 0 ? Math.min(10, (weightedScore / totalCapex) * (10 / 25)) : 0;
  const hasRiskData = projects.some(p => p.risks && p.risks.length > 0);
  const riskColor = riskIndex <= 3 ? '#22C55E' : riskIndex <= 6 ? '#F59E0B' : '#D5001C';
  const riskLabel = riskIndex <= 3 ? 'Baixo' : riskIndex <= 6 ? 'Médio' : 'Alto';

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

        {/* SPI */}
        <div
          style={cardBase}
          className="hover-lift red-accent-top"
          onClick={() => setOpenDrawer('spi')}
          title="Clique para ver detalhes por projeto"
        >
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 10 }}>
            Índice de Desempenho de Prazo (SPI)
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: spiColorVal }}>
                {spi !== null ? spi.toFixed(2) : '—'}{spi !== null && <TrendArrow value={spi} />}
              </p>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {spi !== null
                  ? <>
                      {spiEstimated && <span style={{ fontSize: 10, color: '#F59E0B' }}>⚠️ SPI estimado — forneça PV mensal para cálculo preciso</span>}
                      <span style={{ fontSize: 11, color: '#71717A' }}>EV: {formatCurrency(sumEV)} · PV: {formatCurrency(sumPV)}</span>
                      <span style={{ fontSize: 11, color: spiColorVal }}>
                        {spi >= 0.95 ? '✓ No prazo' : spi >= 0.85 ? '⚠ Ligeiro atraso' : '✗ Atraso crítico'}
                      </span>
                    </>
                  : <span style={{ fontSize: 11, color: '#52525B' }}>Dado não disponível</span>
                }
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 9, color: '#3F3F46' }}>↗ drill-down</div>
          {deco}
        </div>

        {/* CPI */}
        <div
          style={cardBase}
          className="hover-lift red-accent-top"
          onClick={() => setOpenDrawer('cpi')}
          title="Clique para ver detalhes por projeto"
        >
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 10 }}>
            Índice de Desempenho de Custo (CPI)
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: cpiColorVal }}>
                {cpi !== null ? cpi.toFixed(2) : '—'}{cpi !== null && <TrendArrow value={cpi} />}
              </p>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {cpi !== null
                  ? <>
                      <span style={{ fontSize: 11, color: '#71717A' }}>
                        Desvio: {cpiDev !== null ? `${cpiDev >= 0 ? '+' : ''}${formatCurrency(Math.abs(cpiDev))}` : '—'}
                      </span>
                      <span style={{ fontSize: 11, color: cpiColorVal }}>
                        {cpi >= 0.95 ? '✓ Dentro do orçamento' : cpi >= 0.85 ? '⚠ Leve desvio' : '✗ Estouro de custo'}
                      </span>
                    </>
                  : <span style={{ fontSize: 11, color: '#52525B' }}>Dado não disponível</span>
                }
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 9, color: '#3F3F46' }}>↗ drill-down</div>
          {deco}
        </div>

        {/* Risk */}
        <div
          style={cardBase}
          className="hover-lift red-accent-top"
          onClick={() => setOpenDrawer('risk')}
          title="Clique para ver matriz de riscos"
        >
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 10 }}>
            Índice de Exposição a Riscos
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}33`, borderRadius: 99, padding: '3px 12px' }}>
                {riskLabel}
              </span>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {hasRiskData
                  ? <span style={{ fontSize: 11, color: '#71717A' }}>
                      {critical > 0 && <span style={{ color: '#F87171' }}>{critical} crítico{critical !== 1 ? 's' : ''} · </span>}
                      {high > 0 && <span style={{ color: '#D5001C' }}>{high} alto{high !== 1 ? 's' : ''} · </span>}
                      <span style={{ color: '#F59E0B' }}>{medium} médio{medium !== 1 ? 's' : ''} · </span>
                      <span style={{ color: '#22C55E' }}>{low} baixo{low !== 1 ? 's' : ''}</span>
                    </span>
                  : <span style={{ fontSize: 11, color: '#52525B' }}>{total} projeto{total !== 1 ? 's' : ''} analisado{total !== 1 ? 's' : ''}</span>
                }
                <span style={{ fontSize: 11, color: '#52525B' }}>{total} projeto{total !== 1 ? 's' : ''} · índice {riskIndex.toFixed(1)}/10</span>
              </div>
            </div>
            <GaugeArc score={total > 0 ? riskIndex : 0} color={riskColor} />
          </div>
          <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 9, color: '#3F3F46' }}>↗ drill-down</div>
          {deco}
        </div>

      </div>

      {/* Drawers */}
      {openDrawer === 'spi' && <SPIDrawer projects={projects} onClose={() => setOpenDrawer(null)} />}
      {openDrawer === 'cpi' && <CPIDrawer projects={projects} onClose={() => setOpenDrawer(null)} />}
      {openDrawer === 'risk' && <RiskDrawer projects={projects} onClose={() => setOpenDrawer(null)} />}
    </>
  );
}
