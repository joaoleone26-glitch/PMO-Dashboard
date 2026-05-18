'use client';

import { Project } from '@/lib/types';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

function CircularGauge({ pct, color }: { pct: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle
        cx="48" cy="48" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color}88)` }}
      />
      <text x="48" y="48" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export function KPICards({ projects }: { projects: Project[] }) {
  const total = projects.length;
  const counts = { verde: 0, amarelo: 0, vermelho: 0, cinza: 0 };
  for (const p of projects) counts[p.farol] = (counts[p.farol] || 0) + 1;

  // Execução Orçamentária
  let planejado = 0, realizado = 0, hasCapex = false;
  for (const p of projects) {
    if (p.budget?.planned) { planejado += p.budget.planned; hasCapex = true; }
    if (p.budget?.actual) { realizado += p.budget.actual; }
  }
  const execPct = planejado > 0 ? (realizado / planejado) * 100 : 0;
  const execColor = execPct > 100 ? '#D5001C' : execPct >= 40 && execPct <= 90 ? '#22C55E' : '#F59E0B';

  // Health index
  const saudePct = total > 0 ? (counts.verde / total) * 100 : 0;
  const saudeColor = saudePct >= 70 ? '#22C55E' : saudePct >= 40 ? '#F59E0B' : '#D5001C';

  const cardBase: React.CSSProperties = {
    background: '#111111',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '24px 28px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.18s ease, transform 0.18s ease',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

      {/* Card 1: Total de Projetos */}
      <div style={cardBase} className="hover-lift red-accent-top">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 8 }}>
              Total de Projetos
            </p>
            <p style={{ fontSize: 56, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
              {total}
            </p>
          </div>
          <div style={{ width: 44, height: 44, background: 'rgba(213,0,28,0.1)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D5001C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'No prazo', count: counts.verde, color: '#22C55E' },
            { label: 'Atenção', count: counts.amarelo, color: '#F59E0B' },
            { label: 'Crítico', count: counts.vermelho, color: '#D5001C' },
            { label: 'N/A', count: counts.cinza, color: '#4B5563' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, boxShadow: f.color !== '#4B5563' ? `0 0 6px ${f.color}88` : 'none', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#71717A' }}>{f.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: f.color }}>{f.count}</span>
            </div>
          ))}
        </div>
        {/* Decorative line */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle, rgba(213,0,28,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      </div>

      {/* Card 2: Execução Orçamentária */}
      <div style={cardBase} className="hover-lift red-accent-top">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 8 }}>
              Execução Orçamentária
            </p>
            <p style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: hasCapex ? execColor : '#FFFFFF' }}>
              {hasCapex ? `${Math.round(execPct)}%` : '—'}
            </p>
          </div>
          <div style={{ width: 44, height: 44, background: 'rgba(213,0,28,0.1)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D5001C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
        </div>
        {hasCapex ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(execPct, 100)}%`,
                  borderRadius: 99,
                  background: execColor,
                  boxShadow: `0 0 8px ${execColor}66`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#52525B' }}>Gasto: <span style={{ color: '#A1A1AA', fontWeight: 600 }}>{formatCurrency(realizado)}</span></span>
              <span style={{ fontSize: 11, color: '#52525B' }}>Orçado: <span style={{ color: '#A1A1AA', fontWeight: 600 }}>{formatCurrency(planejado)}</span></span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: '#52525B' }}>Carregue projetos com dados de orçamento</p>
        )}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle, rgba(213,0,28,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      </div>

      {/* Card 3: Índice de Saúde */}
      <div style={cardBase} className="hover-lift red-accent-top">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 8 }}>
              Índice de Saúde
            </p>
            <p style={{ fontSize: 14, color: '#A1A1AA', marginBottom: 6 }}>
              {total > 0 ? `${counts.verde} de ${total} projetos no prazo` : 'Aguardando dados'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              {[
                { label: 'Saudável', check: saudePct >= 70 },
                { label: 'Atenção', check: saudePct >= 40 && saudePct < 70 },
                { label: 'Crítico', check: saudePct < 40 && total > 0 },
              ].map(s => s.check && (
                <span key={s.label} style={{ fontSize: 11, color: saudeColor, background: `${saudeColor}18`, border: `1px solid ${saudeColor}33`, borderRadius: 99, padding: '2px 10px', fontWeight: 600 }}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          {total > 0 ? (
            <CircularGauge pct={saudePct} color={saudeColor} />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: '50%', border: '7px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#52525B' }}>—</span>
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle, rgba(213,0,28,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
