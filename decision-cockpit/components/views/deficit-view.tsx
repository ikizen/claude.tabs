import { KpiCard } from '@/components/kpi-card';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';

export function DeficitView({ data }: { data: ParsedReport }) {
  if (data.deficit.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Дефицит под сезон</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const totalOrderCost = data.deficit.reduce((sum, r) => sum + (Number(r['Себест_заказа']) || 0), 0);

  const columns: DataTableColumn[] = [
    { key: 'Модель', header: 'Модель' },
    { key: 'Категория', header: 'Категория' },
    { key: 'Остаток_шт', header: 'Остаток шт', align: 'right', render: (r) => fmtNumber(r['Остаток_шт']) },
    { key: 'ПроданоПик', header: 'Продано пик', align: 'right', render: (r) => fmtNumber(r['ПроданоПик']) },
    {
      key: 'ХватитДней',
      header: 'Хватит дней',
      align: 'right',
      render: (r) => {
        const days = Number(r['ХватитДней']) || 0;
        return (
          <span className="inline-flex items-center gap-2">
            {fmtNumber(r['ХватитДней'])}
            {days < 10 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">СРОЧНО</span>
            )}
          </span>
        );
      },
    },
    { key: 'ВП12', header: 'ВП12', align: 'right', render: (r) => fmtMoney(r['ВП12']) },
    { key: 'Маржа', header: 'Маржа', align: 'right', render: (r) => fmtPercent(r['Маржа']) },
    { key: 'Заказать_шт', header: 'Заказать шт', align: 'right', render: (r) => fmtNumber(r['Заказать_шт']) },
    { key: 'Себест_заказа', header: 'Себест. заказа', align: 'right', render: (r) => fmtMoney(r['Себест_заказа']) },
    { key: 'Приоритет', header: 'Приоритет' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Дефицит под сезон</h2>
      <KpiCard label="Себестоимость заказа (сумма)" value={fmtMoney(totalOrderCost)} className="max-w-xs" />
      <DataTable columns={columns} rows={data.deficit} defaultSortKey="ХватитДней" defaultSortDir={1} />
    </div>
  );
}
