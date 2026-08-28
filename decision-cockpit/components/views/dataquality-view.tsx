import { cn } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { fmtMoney, fmtNumber } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';

const FLAG_CLASS: Record<string, string> = {
  'DATA ERROR': 'bg-red-600',
  NEW: 'bg-sky-600',
  THIN: 'bg-amber-600',
  CENSORED: 'bg-violet-600',
};

export function DataQualityView({ data }: { data: ParsedReport }) {
  if (data.dataquality.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Качество данных</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const totalPositions = data.dataquality.reduce((s, r) => s + (Number(r['Позиций']) || 0), 0);
  const totalStock = data.dataquality.reduce((s, r) => s + (Number(r['Остаток_тг']) || 0), 0);
  const kpiTotalRow = data.kpi.find((r) => String(r['Показатель'] ?? '').includes('Остаток по себестоимости'));
  const kpiTotal = kpiTotalRow ? Number(kpiTotalRow['Значение']) || 0 : 0;
  const pct = kpiTotal > 0 ? (totalStock / kpiTotal) * 100 : null;

  const columns: DataTableColumn[] = [
    {
      key: 'Флаг',
      header: 'Флаг',
      render: (r) => (
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white', FLAG_CLASS[String(r['Флаг'])] ?? 'bg-muted')}>
          {String(r['Флаг'])}
        </span>
      ),
    },
    { key: 'Позиций', header: 'Позиций', align: 'right', render: (r) => fmtNumber(r['Позиций']) },
    { key: 'Остаток_тг', header: 'Остаток', align: 'right', render: (r) => fmtMoney(r['Остаток_тг']) },
    { key: 'Что означает', header: 'Что означает' },
    { key: 'Что делать', header: 'Что делать' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Качество данных</h2>
      <DataTable columns={columns} rows={data.dataquality} />
      <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
        Позиции с этими флагами выведены из автоматических решений. Суммарно это {fmtNumber(totalPositions)} позиций на{' '}
        {fmtMoney(totalStock)}
        {pct !== null && ` — ${pct.toFixed(1)}% капитала.`}
      </div>
    </div>
  );
}
