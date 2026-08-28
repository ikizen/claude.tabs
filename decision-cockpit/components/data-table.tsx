'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportRow } from '@/lib/parse';

export type DataTableColumn = {
  key: string;
  header: string;
  render?: (row: ReportRow) => React.ReactNode;
  sortValue?: (row: ReportRow) => string | number;
  align?: 'left' | 'right';
  hideOnMobile?: boolean;
};

// Даёт первым 20 строкам небольшую ступенчатую задержку появления —
// на тысячах строк без ограничения это раздражает, поэтому не дальше 20-й.
function rowStyle(index: number): React.CSSProperties | undefined {
  if (index >= 20) return undefined;
  return { animationDelay: `${index * 25}ms` };
}

export function DataTable({
  columns,
  rows,
  defaultSortKey,
  defaultSortDir = 1,
  emptyMessage = 'Нет данных.',
}: {
  columns: DataTableColumn[];
  rows: ReportRow[];
  defaultSortKey?: string;
  defaultSortDir?: 1 | -1;
  emptyMessage?: string;
}) {
  const [sortKey, setSortKey] = React.useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = React.useState<1 | -1>(defaultSortDir);

  const sorted = React.useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    const getValue = col?.sortValue ?? ((row: ReportRow) => row[sortKey]);
    return [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * sortDir;
    });
  }, [rows, sortKey, sortDir, columns]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  const primaryKey = columns[0]?.key;

  return (
    <>
      {/* Десктоп: обычная таблица */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn('cursor-pointer select-none', col.align === 'right' && 'text-right')}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortKey === col.key && (sortDir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, idx) => (
              <TableRow key={idx} className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both" style={rowStyle(idx)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.align === 'right' ? 'text-right' : undefined}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Мобильный: карточки вместо таблицы — без горизонтальной прокрутки */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((row, idx) => (
          <div
            key={idx}
            className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both rounded-xl border bg-card p-4 shadow-sm duration-300"
            style={rowStyle(idx)}
          >
            {columns
              .filter((c) => c.key === primaryKey)
              .map((col) => (
                <div key={col.key} className="mb-2 border-b pb-2 font-semibold">
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </div>
              ))}
            <div className="flex flex-col gap-1.5">
              {columns
                .filter((c) => c.key !== primaryKey && !c.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{col.header}</span>
                    <span className="text-right">{col.render ? col.render(row) : String(row[col.key] ?? '')}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
