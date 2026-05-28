export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}R$ ${(abs / 1_000_000_000).toFixed(1)}Bi`;
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}Mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}R$ ${Math.round(abs).toLocaleString('pt-BR')}`;
}
