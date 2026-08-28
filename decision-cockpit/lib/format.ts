export function fmtNumber(value: unknown): string {
  if (typeof value !== 'number') return (value as string) ?? '';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}

export function fmtMoney(value: unknown): string {
  if (typeof value !== 'number') return (value as string) ?? '';
  return `${fmtNumber(value)} ₸`;
}

export function fmtPercent(value: unknown): string {
  if (typeof value !== 'number') return (value as string) ?? '';
  return `${(value * 100).toFixed(1)}%`;
}

export function numericPrefix(name: unknown): string | null {
  const m = String(name ?? '').match(/^(\d+(?:\.\d+)?)\s*-/);
  return m ? m[1] : null;
}
