import { KpiCard } from '@/components/kpi-card';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { StatusBadge, statusBarClass } from '@/components/status-badge';
import { fmtMoney, fmtNumber } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';

export function OverviewView({ data }: { data: ParsedReport }) {
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
