import { numericPrefix } from '@/lib/format';
import type { ReportRow } from '@/lib/parse';

export type ForecastNode = {
  row: ReportRow;
  children: ForecastNode[];
  isBucket?: boolean;
};

export function buildForecastTree(forecast: ReportRow[], models: ReportRow[]): ForecastNode[] {
  const categories = forecast
    .filter((r) => r['Уровень'] === 'категория')
    .map((row) => ({ row, prefix: numericPrefix(row['Объект']) || String(row['Объект']), children: [] as ForecastNode[] }));
  const subcategories = forecast
    .filter((r) => r['Уровень'] === 'подкатегория')
    .map((row) => ({ row, prefix: numericPrefix(row['Объект']) || String(row['Объект']), children: [] as ForecastNode[] }));
  const modelNodes: ForecastNode[] = forecast.filter((r) => r['Уровень'] === 'модель').map((row) => ({ row, children: [] }));

  const catByPrefix = new Map(categories.map((c) => [c.prefix, c]));
  const orphanSubs: typeof subcategories = [];
  subcategories.forEach((sub) => {
    const parentPrefix = sub.prefix.includes('.') ? sub.prefix.split('.')[0] : null;
    const parent = parentPrefix ? catByPrefix.get(parentPrefix) : undefined;
    if (parent) parent.children.push(sub);
    else orphanSubs.push(sub);
  });

  const subByPrefix = new Map(subcategories.map((s) => [s.prefix, s]));
  const unassignedModels: ForecastNode[] = [];
  modelNodes.forEach((node) => {
    const info = models.find((m) => m['Модель'] === node.row['Объект']);
    const subPrefix = info ? numericPrefix(info['Подкатегория']) : null;
    const catPrefix = info ? numericPrefix(info['Категория']) : null;
    if (subPrefix && subByPrefix.has(subPrefix)) subByPrefix.get(subPrefix)!.children.push(node);
    else if (catPrefix && catByPrefix.has(catPrefix)) catByPrefix.get(catPrefix)!.children.push(node);
    else unassignedModels.push(node);
  });

  const roots: ForecastNode[] = [...categories, ...orphanSubs];
  if (unassignedModels.length) {
    roots.push({ row: { 'Объект': 'Без привязки к категории', 'Уровень': '' }, children: unassignedModels, isBucket: true });
  }
  return roots;
}

// 12 месячных приращений линейной интерполяцией между известными контрольными
// точками (1/3/6/9/12 мес) — только форма спарклайна, не точные цифры.
export function monthlySeries(row: ReportRow): number[] {
  const checkpoints = [0, 1, 3, 6, 9, 12];
  const cum = [0, row['Прогноз_1м'], row['Прогноз_3м'], row['Прогноз_6м'], row['Прогноз_9м'], row['Прогноз_12м']].map(
    (v) => Number(v) || 0
  );
  const months: number[] = [];
  for (let m = 1; m <= 12; m++) {
    let i = 0;
    while (i < checkpoints.length - 1 && checkpoints[i + 1] < m) i++;
    const a = checkpoints[i];
    const b = checkpoints[i + 1];
    const va = cum[i];
    const vb = cum[i + 1];
    const frac = b > a ? (m - a) / (b - a) : 1;
    months.push(va + (vb - va) * frac);
  }
  return months.map((v, i) => Math.max(v - (i === 0 ? 0 : months[i - 1]), 0));
}
