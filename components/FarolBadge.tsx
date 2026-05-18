'use client';

import { FarolStatus } from '@/lib/types';

const config: Record<FarolStatus, { label: string; color: string; bg: string; border: string }> = {
  verde:    { label: 'No Prazo', color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  amarelo:  { label: 'Atenção',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  vermelho: { label: 'Crítico',  color: '#D5001C', bg: 'rgba(213,0,28,0.1)',   border: 'rgba(213,0,28,0.25)'   },
  cinza:    { label: 'N/A',      color: '#6B7280', bg: 'rgba(107,114,128,0.1)',border: 'rgba(107,114,128,0.2)' },
};

export function FarolBadge({ status }: { status: FarolStatus }) {
  const c = config[status] || config.cinza;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: c.bg, border: `1px solid ${c.border}`, fontSize: 11, fontWeight: 600, color: c.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, boxShadow: c.color !== '#6B7280' ? `0 0 6px ${c.color}` : 'none', display: 'inline-block', flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

export function FarolDot({ status }: { status: FarolStatus }) {
  const c = config[status] || config.cinza;
  return (
    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c.color, boxShadow: c.color !== '#6B7280' ? `0 0 8px ${c.color}88` : 'none' }} />
  );
}
