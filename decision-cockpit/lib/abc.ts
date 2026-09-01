// ABC-классификация (правило Парето) — детерминированное вычисление,
// не бизнес-решение с оговорками (в отличие, например, от "Закупать
// да/нет" в закупе), поэтому считаем в браузере из сырых чисел отчёта,
// не требуя от генератора отчёта отдельной разметки класса.
export type AbcClass = 'A' | 'B' | 'C';

export type AbcRow<T> = T & {
  abcClass: AbcClass;
  share: number;
  cumShare: number;
  rank: number;
};

export function computeAbc<T extends Record<string, unknown>>(rows: T[], valueKey: string): AbcRow<T>[] {
  const total = rows.reduce((sum, r) => sum + (Number(r[valueKey]) || 0), 0);
  const sorted = [...rows].sort((a, b) => (Number(b[valueKey]) || 0) - (Number(a[valueKey]) || 0));
  let cum = 0;
  return sorted.map((row, i) => {
    const value = Number(row[valueKey]) || 0;
    cum += value;
    const cumShare = total > 0 ? cum / total : 0;
    const share = total > 0 ? value / total : 0;
    const abcClass: AbcClass = cumShare <= 0.8 ? 'A' : cumShare <= 0.95 ? 'B' : 'C';
    return { ...row, abcClass, share, cumShare, rank: i + 1 };
  });
}

export function abcSummary<T>(rows: AbcRow<T>[]) {
  const classes: AbcClass[] = ['A', 'B', 'C'];
  return classes.map((cls) => {
    const inClass = rows.filter((r) => r.abcClass === cls);
    const shareSum = inClass.reduce((s, r) => s + r.share, 0);
    return { cls, count: inClass.length, shareSum };
  });
}
