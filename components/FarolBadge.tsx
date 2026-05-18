'use client';

import { FarolStatus } from '@/lib/types';

const config: Record<FarolStatus, { label: string; color: string; dot: string }> = {
  verde: { label: 'No Prazo', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  amarelo: { label: 'Atenção', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  vermelho: { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
  cinza: { label: 'Sem dados', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
};

export function FarolBadge({ status }: { status: FarolStatus }) {
  const c = config[status] || config.cinza;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.color}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function FarolDot({ status, size = 'md' }: { status: FarolStatus; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6' };
  const dots: Record<FarolStatus, string> = {
    verde: 'bg-emerald-500 shadow-emerald-200',
    amarelo: 'bg-amber-500 shadow-amber-200',
    vermelho: 'bg-red-500 shadow-red-200',
    cinza: 'bg-gray-400',
  };
  return (
    <span className={`inline-block rounded-full shadow-sm ${sizes[size]} ${dots[status] || dots.cinza}`} />
  );
}
