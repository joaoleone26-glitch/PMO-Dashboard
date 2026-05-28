'use client';

import { Project } from '@/lib/types';

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toLocaleString('pt-BR')}`;
}

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

const cardBase: React.CSSProperties = {
  background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
  padding: '22px 24px', position: 'relative', overflow: 'hidden',
  transition: 'border-color 0.18s ease, transform 0.18s ease',
};
const deco = <div style={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle, rgba(213,0,28,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />;

export function KPICards({ projects }: { projects: Project[] }) {
  const total = projects.length;
  const counts = { verde: 0, amarelo: 0, vermelho: 0, cinza: 0 };
  for (const p of projects) counts[p.farol] = (counts[p.farol] || 0) + 1;

  // SPI
  let sumEV = 0, sumPV = 0, spiN = 0;
  for (const p of projects) {
    const budget = p.budget?.planned;
    const prog = p.progress ?? 0;
    const ev = p.ev ?? (budget ? budget * (prog / 100) : null);
    let pv = p.pv;
    if (!pv && budget && p.deadline && p.startDate) {
      const start = new Date(p.startDate).getTime();
      const end = new Date(p.deadline).getTime();
      const elapsed = Math.max(0, Math.min(1, (Date.now() - start) / (end - start)));
      pv = budget * elapsed;
    }
    if (ev !== null && pv && pv > 0) { sumEV += ev; sumPV += pv; spiN++; }
  }
  const spi = spiN > 0 && sumPV > 0 ? sumEV / sumPV : null;
  const spiColor = spi === null ? '#52525B' : spi >= 0.95 ? '#22C55E' : spi >= 0.85 ? '#F59E0B' : '#D5001C';

  // CPI
  let sumAC = 0, cpiEV = 0, cpiN = 0;
  for (const p of projects) {
    const budget = p.budget?.planned;
    const actual = p.ac ?? p.budget?.actual;
    const ev = p.ev ?? (budget ? budget * ((p.progress ?? 0) / 100) : null);
    if (ev !== null && actual && actual > 0) { cpiEV += ev; sumAC += actual; cpiN++; }
  }
  const cpi = cpiN > 0 && sumAC > 0 ? cpiEV / sumAC : null;
  const cpiColor = cpi === null ? '#52525B' : cpi >= 0.95 ? '#22C55E' : cpi >= 0.85 ? '#F59E0B' : '#D5001C';
  const cpiDev = cpiN > 0 ? cpiEV - sumAC : null;

  // Risk exposure
  const riskScore = Math.min(10, total > 0 ? ((counts.vermelho * 3 + counts.amarelo) / total) * (10 / 3) : 0);
  const riskColor = riskScore <= 3 ? '#22C55E' : riskScore <= 6 ? '#F59E0B' : '#D5001C';
  const riskLabel = riskScore <= 3 ? 'Baixo' : riskScore <= 6 ? 'Médio' : 'Alto';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

      {/* SPI */}
      <div style={cardBase} className="hover-lift red-accent-top">
        <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 10 }}>
          Índice de Desempenho de Prazo (SPI)
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: spiColor }}>
              {spi !== null ? spi.toFixed(2) : '—'}{spi !== null && <TrendArrow value={spi} />}
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {spi !== null
                ? <>
                    <span style={{ fontSize: 11, color: '#71717A' }}>EV: {formatCurrency(sumEV)} · PV: {formatCurrency(sumPV)}</span>
                    <span style={{ fontSize: 11, color: spiColor }}>
                      {spi >= 0.95 ? '✓ No prazo' : spi >= 0.85 ? '⚠ Ligeiro atraso' : '✗ Atraso crítico'}
                    </span>
                  </>
                : <span style={{ fontSize: 11, color: '#52525B' }}>Sem dados de valor planejado/datas</span>
              }
            </div>
          </div>
        </div>
        {deco}
      </div>

      {/* CPI */}
      <div style={cardBase} className="hover-lift red-accent-top">
        <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 10 }}>
          Índice de Desempenho de Custo (CPI)
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: cpiColor }}>
              {cpi !== null ? cpi.toFixed(2) : '—'}{cpi !== null && <TrendArrow value={cpi} />}
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {cpi !== null
                ? <>
                    <span style={{ fontSize: 11, color: '#71717A' }}>
                      Desvio: {cpiDev !== null ? `${cpiDev >= 0 ? '+' : ''}${formatCurrency(Math.abs(cpiDev))}` : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: cpiColor }}>
                      {cpi >= 0.95 ? '✓ Dentro do orçamento' : cpi >= 0.85 ? '⚠ Leve desvio' : '✗ Estouro de custo'}
                    </span>
                  </>
                : <span style={{ fontSize: 11, color: '#52525B' }}>Sem dados de custo real</span>
              }
            </div>
          </div>
        </div>
        {deco}
      </div>

      {/* Risk */}
      <div style={cardBase} className="hover-lift red-accent-top">
        <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 10 }}>
          Índice de Exposição a Riscos
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}33`, borderRadius: 99, padding: '3px 12px' }}>
              {riskLabel}
            </span>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 11, color: '#71717A' }}>
                {counts.vermelho} crítico{counts.vermelho !== 1 ? 's' : ''} · {counts.amarelo} atenção · {counts.verde} saudável{counts.verde !== 1 ? 'is' : ''}
              </span>
              <span style={{ fontSize: 11, color: '#52525B' }}>{total} projeto{total !== 1 ? 's' : ''} analisado{total !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <GaugeArc score={total > 0 ? riskScore : 0} color={riskColor} />
        </div>
        {deco}
      </div>

    </div>
  );
}
