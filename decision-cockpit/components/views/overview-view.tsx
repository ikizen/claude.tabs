import { KpiCard } from '@/components/kpi-card';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { StatusBadge, statusBarClass } from '@/components/status-badge';
import { fmtMoney, fmtNumber } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';
import type { FlagAxis } from '@/lib/status-labels';

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
              value={fmtNumber(row['Значение'])}
              caption={row['Подпись'] as string}
              tone={row['Оценка'] === 'good' ? 'good' : row['Оценка'] === 'bad' ? 'bad' : 'neutral'}
            />
          ))}
        </div>
      )}

      {data.productTree && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLAG_PLAQUES.map(({ axis, value, label, tone }) => {
            const count = data.models.filter((r) => r[`flags_${axis}`] === value).length;
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
