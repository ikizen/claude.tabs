import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/kpi-card';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { StatusBadge, statusBarClass } from '@/components/status-badge';
import { fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';
import type { FlagAxis } from '@/lib/status-labels';

// Показатели с "маржа"/"маржинальность" в названии в KPI приходят долей
// (0.136), а не деньгами — показываем их в %, а не сырым числом.
function kpiValueDisplay(label: string, value: unknown): string {
  if (typeof value === 'number' && /марж/i.test(label) && Math.abs(value) <= 5) {
    return fmtPercent(value);
  }
  return fmtNumber(value);
}

const FLAG_PLAQUES: { axis: FlagAxis; value: string; label: string; tone: string }[] = [
  { axis: 'dataQuality', value: 'CHECK DATA', label: 'позиций требуют проверки данных', tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  { axis: 'economics', value: 'PRICE FIX', label: 'позиций — пересмотра цены', tone: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200' },
  { axis: 'history', value: 'THIN', label: 'позиций — мало истории (THIN)', tone: 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200' },
  { axis: 'history', value: 'NEW', label: 'позиций — новинки, сезон впереди', tone: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200' },
];

export function OverviewView({
  data,
  onFilterModels,
}: {
  data: ParsedReport;
  onFilterModels?: (axis: FlagAxis, value: string) => void;
}) {
  const total = data.statuses.reduce((sum, s) => sum + (Number(s['Остаток']) || 0), 0);

  const columns: DataTableColumn[] = [
    { key: 'Статус', header: 'Статус', render: (r) => <StatusBadge code={String(r['Статус'])} /> },
    { key: 'Моделей', header: 'Моделей', align: 'right', render: (r) => fmtNumber(r['Моделей']) },
    { key: 'Остаток', header: 'Остаток', align: 'right', render: (r) => fmtMoney(r['Остаток']) },
    {
      key: 'pct',
      header: '%',
      align: 'right',
      sortValue: (r) => (total > 0 ? (Number(r['Остаток']) || 0) / total : 0),
      render: (r) => `${total > 0 ? (((Number(r['Остаток']) || 0) / total) * 100).toFixed(1) : '0.0'}%`,
    },
    { key: 'Излишек', header: 'Излишек', align: 'right', render: (r) => fmtMoney(r['Излишек']) },
    {
      key: 'Возврат_консерв',
      header: 'Возврат консерв.',
      align: 'right',
      render: (r) => fmtMoney(r['Возврат_консерв'] ?? r['Возврат_база']),
    },
    {
      key: 'Возврат_базовый',
      header: 'Возврат базовый',
      align: 'right',
      render: (r) => fmtMoney(r['Возврат_базовый'] ?? r['Возврат_база']),
    },
    { key: 'Возврат_агрессив', header: 'Возврат агрессив.', align: 'right', render: (r) => fmtMoney(r['Возврат_агрессив']) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Обзор</h2>

      {data.kpi.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных KPI.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.kpi.map((row, i) => (
            <KpiCard
              key={i}
              label={String(row['Показатель'] ?? '')}
              value={kpiValueDisplay(String(row['Показатель'] ?? ''), row['Значение'])}
              caption={row['Подпись'] as string}
              tone={row['Оценка'] === 'good' ? 'good' : row['Оценка'] === 'bad' ? 'bad' : 'neutral'}
            />
          ))}
        </div>
      )}

      {data.productTree && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLAG_PLAQUES.map(({ axis, value, label, tone }) => {
            const rows = data.models.filter((r) => r[`flags_${axis}`] === value);
            const count = rows.length;
            const isPriceFix = axis === 'economics' && value === 'PRICE FIX';

            if (!isPriceFix) {
              return (
                <button
                  key={`${axis}:${value}`}
                  onClick={() => onFilterModels?.(axis, value)}
                  disabled={!onFilterModels}
                  className={`rounded-lg border p-4 text-left transition-opacity ${tone} ${onFilterModels ? 'cursor-pointer hover:opacity-80' : ''}`}
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm">{label}</div>
                </button>
              );
            }

            const unitsSum = rows.reduce((s, r) => s + (Number(r['Остаток_шт']) || 0), 0);
            const valueSum = rows.reduce((s, r) => s + (Number(r['Остаток_тг']) || 0), 0);
            const revenueSum = rows.reduce((s, r) => s + (Number(r['Выручка12']) || 0), 0);
            const totalGp = rows.reduce((s, r) => s + (Number(r['ВП12']) || 0), 0);
            const negativeGp = rows.reduce((s, r) => {
              const gp = Number(r['ВП12']) || 0;
              return gp < 0 ? s + gp : s;
            }, 0);
            const marginPlan = revenueSum !== 0 ? totalGp / revenueSum : null;

            return (
              <div key={`${axis}:${value}`} className={cn('rounded-lg border p-4 lg:col-span-2', tone)}>
                <button
                  onClick={() => onFilterModels?.(axis, value)}
                  disabled={!onFilterModels}
                  className={cn('block w-full text-left', onFilterModels && 'cursor-pointer hover:opacity-80')}
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm">{label}</div>
                </button>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-current/15 pt-3 text-xs sm:grid-cols-3">
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="opacity-80">SKU</dt>
                    <dd className="text-right font-semibold tabular-nums sm:mt-0.5">{fmtNumber(count)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="opacity-80">Штук</dt>
                    <dd className="text-right font-semibold tabular-nums sm:mt-0.5">{fmtNumber(unitsSum)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="opacity-80">Сумма остатка</dt>
                    <dd className="text-right font-semibold tabular-nums sm:mt-0.5">{fmtMoney(valueSum)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="opacity-80">План выручки, тек. цены</dt>
                    <dd className="text-right font-semibold tabular-nums sm:mt-0.5">{fmtMoney(revenueSum)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="opacity-80">План отриц. прибыли</dt>
                    <dd className="text-right font-semibold tabular-nums sm:mt-0.5">{fmtMoney(negativeGp)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="opacity-80">План маржи</dt>
                    <dd className="text-right font-semibold tabular-nums sm:mt-0.5">{marginPlan !== null ? fmtPercent(marginPlan) : '—'}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="text-sm font-medium text-muted-foreground">Карта капитала по статусам</h3>
      {data.statuses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных по статусам.</p>
      ) : (
        <>
          <div className="flex h-7 w-full overflow-hidden rounded-md border">
            {data.statuses.map((s, i) => {
              const amount = Number(s['Остаток']) || 0;
              const pct = total > 0 ? (amount / total) * 100 : 0;
              return (
                <div
                  key={i}
                  className={statusBarClass(String(s['Статус']))}
                  style={{ width: `${pct}%` }}
                  title={`${s['Статус']}: ${fmtMoney(amount)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <DataTable columns={columns} rows={data.statuses} />
        </>
      )}
    </div>
  );
}
