export function fmtNumber(value: unknown): string {
  if (typeof value !== 'number') return (value as string) ?? '';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
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

// Некоторые поля отчёта — свободный текст с числами внутри ("ВП 248571061
// при расходах 252000000"), а не отдельная числовая колонка, поэтому не
// проходят через fmtNumber. Находим в тексте целые числа от 5 цифр (это
// заведомо суммы/остатки, а не год вроде "2026" или код вроде "2026-W27")
// и расставляем в них разделители тысяч, не трогая остальной текст.
export function fmtEmbeddedNumbers(text: unknown): string {
  if (typeof text !== 'string') return text == null ? '' : String(text);
  return text.replace(/\d{5,}/g, (match) => fmtNumber(Number(match)));
}
