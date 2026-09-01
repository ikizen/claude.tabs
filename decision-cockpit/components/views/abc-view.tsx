'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/kpi-card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { computeAbc, abcSummary, type AbcClass } from '@/lib/abc';
import { fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import type { ParsedReport, ReportRow } from '@/lib/parse';

const CLASS_BADGE: Record<AbcClass, string> = {
  A: 'bg-emerald-600',
  B: 'bg-amber-600',
  C: 'bg-slate-500',
};

const CLASS_HINT: Record<AbcClass, string> = {
  A: 'первые 80% выручки — держать в приоритете',
  B: 'следующие 15% — работать по плану',
  C: 'последние 5% — под заказ или пересмотр',
};

function ClassBadge({ cls }: { cls: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white', CLASS_BADGE[cls as AbcClass] ?? 'bg-muted-foreground')}>
      {cls}
    </span>
  );
}

export function AbcView({ data }: { data: ParsedReport }) {
  const hasProducts = data.abcproducts.length > 0;
  const hasClients = data.clients.length > 0;
  const [mode, setMode] = React.useState<'products' | 'clients'>(hasProducts ? 'products' : 'clients');

  if (!hasProducts && !hasClients) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">ABC-анализ</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const activeRows = mode === 'products' ? data.abcproducts : data.clients;
  const valueKey = mode === 'products' ? 'Выручка' : 'Оборот_тек';
  const rows = computeAbc(activeRows, valueKey) as unknown as ReportRow[];
  const summary = abcSummary(computeAbc(activeRows, valueKey));

  const columns: DataTableColumn[] =
    mode === 'products'
      ? [
          { key: 'rank', header: '#', filterable: false, align: 'right', sortValue: (r) => Number(r['rank']), render: (r) => String(r['rank']) },
          { key: 'Модель', header: 'Модель' },
          { key: 'Категория', header: 'Категория' },
          { key: 'Количество', header: 'Количество', align: 'right', render: (r) => fmtNumber(r['Количество']) },
          { key: 'Выручка', header: 'Выручка', align: 'right', render: (r) => fmtMoney(r['Выручка']) },
          { key: 'Маржа', header: 'Маржа', align: 'right', render: (r) => fmtPercent(r['Маржа']) },
          { key: 'share', header: 'Доля, %', filterable: false, align: 'right', sortValue: (r) => Number(r['share']), render: (r) => fmtPercent(r['share']) },
          {
            key: 'cumShare',
            header: 'Накопл., %',
            filterable: false,
            align: 'right',
            sortValue: (r) => Number(r['cumShare']),
            render: (r) => fmtPercent(r['cumShare']),
          },
          { key: 'abcClass', header: 'Класс', render: (r) => <ClassBadge cls={String(r['abcClass'])} /> },
        ]
      : [
          { key: 'rank', header: '#', filterable: false, align: 'right', sortValue: (r) => Number(r['rank']), render: (r) => String(r['rank']) },
          { key: 'Клиент', header: 'Клиент' },
          { key: 'Город', header: 'Город' },
          { key: 'Оборот_тек', header: 'Оборот', align: 'right', render: (r) => fmtMoney(r['Оборот_тек']) },
          { key: 'share', header: 'Доля, %', filterable: false, align: 'right', sortValue: (r) => Number(r['share']), render: (r) => fmtPercent(r['share']) },
          {
            key: 'cumShare',
            header: 'Накопл., %',
            filterable: false,
            align: 'right',
            sortValue: (r) => Number(r['cumShare']),
            render: (r) => fmtPercent(r['cumShare']),
          },
          { key: 'abcClass', header: 'Класс', render: (r) => <ClassBadge cls={String(r['abcClass'])} /> },
        ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">ABC-анализ</h2>

      {hasProducts && hasClients && (
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as 'products' | 'clients')}>
          <ToggleGroupItem value="products">По товару</ToggleGroupItem>
          <ToggleGroupItem value="clients">По клиенту</ToggleGroupItem>
        </ToggleGroup>
      )}

      {activeRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных {mode === 'products' ? 'по товарам' : 'по клиентам'}.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summary.map((s) => (
              <KpiCard
                key={s.cls}
                label={`Класс ${s.cls}`}
                value={<ClassBadge cls={s.cls} />}
                caption={`${fmtNumber(s.count)} ${mode === 'products' ? 'позиций' : 'клиентов'} · ${(s.shareSum * 100).toFixed(1)}% выручки · ${CLASS_HINT[s.cls]}`}
              />
            ))}
          </div>

          <DataTable columns={columns} rows={rows} defaultSortKey="rank" defaultSortDir={1} />
        </>
      )}
    </div>
  );
}
