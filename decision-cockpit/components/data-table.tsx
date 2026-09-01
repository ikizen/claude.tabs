'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Filter } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HeaderLabel } from '@/components/header-label';
import type { ReportRow } from '@/lib/parse';

export type DataTableColumn = {
  key: string;
  header: string;
  render?: (row: ReportRow) => React.ReactNode;
  sortValue?: (row: ReportRow) => string | number;
  align?: 'left' | 'right';
  hideOnMobile?: boolean;
  filterable?: boolean;
};

type ColumnFilter = { kind: 'set'; values: Set<string> } | { kind: 'range'; min: number | null; max: number | null };

// Даёт первым 20 строкам небольшую ступенчатую задержку появления —
// на тысячах строк без ограничения это раздражает, поэтому не дальше 20-й.
function rowStyle(index: number): React.CSSProperties | undefined {
  if (index >= 20) return undefined;
  return { animationDelay: `${index * 25}ms` };
}

function isNumericColumn(rows: ReportRow[], key: string): boolean {
  const values = rows.map((r) => r[key]).filter((v) => v !== undefined && v !== null && v !== '');
  if (values.length === 0) return false;
  return values.every((v) => typeof v === 'number');
}

function ColumnFilterMenu({
  col,
  rows,
  active,
  onChange,
}: {
  col: DataTableColumn;
  rows: ReportRow[];
  active: ColumnFilter | undefined;
  onChange: (filter: ColumnFilter | undefined) => void;
}) {
  const numeric = isNumericColumn(rows, col.key);
  const [open, setOpen] = React.useState(false);
  const hasFilter = !!active;

  const distinctValues = React.useMemo(() => {
    if (numeric) return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = r[col.key];
      if (v !== undefined && v !== null && v !== '') set.add(String(v));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows, col.key, numeric]);

  const [rangeMin, setRangeMin] = React.useState('');
  const [rangeMax, setRangeMax] = React.useState('');

  React.useEffect(() => {
    if (active?.kind === 'range') {
      setRangeMin(active.min !== null ? String(active.min) : '');
      setRangeMax(active.max !== null ? String(active.max) : '');
    }
  }, [active]);

  function toggleValue(value: string) {
    const current = active?.kind === 'set' ? new Set(active.values) : new Set<string>();
    if (current.has(value)) current.delete(value);
    else current.add(value);
    onChange(current.size === 0 ? undefined : { kind: 'set', values: current });
  }

  function applyRange() {
    const min = rangeMin.trim() === '' ? null : Number(rangeMin);
    const max = rangeMax.trim() === '' ? null : Number(rangeMax);
    if (min === null && max === null) onChange(undefined);
    else onChange({ kind: 'range', min, max });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded transition-opacity',
            hasFilter ? 'text-primary opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100'
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Фильтр по столбцу ${col.header}`}
        >
          <Filter className="size-3.5" fill={hasFilter ? 'currentColor' : 'none'} />
        </button>
      </PopoverTrigger>
      <PopoverContent onClick={(e) => e.stopPropagation()} className="w-64">
        {numeric ? (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-muted-foreground">Диапазон: {col.header}</div>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="от" value={rangeMin} onChange={(e) => setRangeMin(e.target.value)} className="h-8" />
              <Input type="number" placeholder="до" value={rangeMax} onChange={(e) => setRangeMax(e.target.value)} className="h-8" />
            </div>
            <div className="flex justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRangeMin('');
                  setRangeMax('');
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Сбросить
              </Button>
              <Button size="sm" onClick={applyRange}>
                Применить
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Фильтр: {col.header}</span>
              {hasFilter && (
                <button className="text-primary hover:underline" onClick={() => onChange(undefined)}>
                  сбросить
                </button>
              )}
            </div>
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {distinctValues.map((value) => {
                const checked = active?.kind === 'set' ? active.values.has(value) : false;
                return (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                    <Checkbox checked={checked} onCheckedChange={() => toggleValue(value)} />
                    <span className="truncate">{value}</span>
                  </label>
                );
              })}
              {distinctValues.length === 0 && <div className="text-xs text-muted-foreground">Нет значений.</div>}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function DataTable({
  columns,
  rows,
  defaultSortKey,
  defaultSortDir = 1,
  emptyMessage = 'Нет данных.',
  onRowClick,
}: {
  columns: DataTableColumn[];
  rows: ReportRow[];
  defaultSortKey?: string;
  defaultSortDir?: 1 | -1;
  emptyMessage?: string;
  onRowClick?: (row: ReportRow) => void;
}) {
  const [sortKey, setSortKey] = React.useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = React.useState<1 | -1>(defaultSortDir);
  const [filters, setFilters] = React.useState<Record<string, ColumnFilter>>({});

  const filtered = React.useMemo(() => {
    const active = Object.entries(filters);
    if (active.length === 0) return rows;
    return rows.filter((row) =>
      active.every(([key, filter]) => {
        const value = row[key];
        if (filter.kind === 'set') return filter.values.has(String(value ?? ''));
        const num = typeof value === 'number' ? value : NaN;
        if (Number.isNaN(num)) return false;
        if (filter.min !== null && num < filter.min) return false;
        if (filter.max !== null && num > filter.max) return false;
        return true;
      })
    );
  }, [rows, filters]);

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const getValue = col?.sortValue ?? ((row: ReportRow) => row[sortKey]);
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * sortDir;
    });
  }, [filtered, sortKey, sortDir, columns]);

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
  const activeFilterCount = Object.keys(filters).length;

  return (
    <>
      {activeFilterCount > 0 && (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Фильтров: {activeFilterCount} · показано {sorted.length} из {rows.length}
          </span>
          <button className="text-primary hover:underline" onClick={() => setFilters({})}>
            сбросить все
          </button>
        </div>
      )}

      {/* Десктоп: обычная таблица */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={cn('group', col.align === 'right' && 'text-right')}>
                  <span className="inline-flex items-center">
                    <span className="cursor-pointer select-none" onClick={() => toggleSort(col.key)}>
                      <span className="inline-flex items-center gap-1">
                        <HeaderLabel label={col.header} glossaryKey={col.key} />
                        {sortKey === col.key && (sortDir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </span>
                    </span>
                    {col.filterable !== false && <ColumnFilterMenu col={col} rows={rows} active={filters[col.key]} onChange={(f) => setFilters((prev) => {
                      const next = { ...prev };
                      if (f) next[col.key] = f;
                      else delete next[col.key];
                      return next;
                    })} />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, idx) => (
              <TableRow
                key={idx}
                className={cn('animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both', onRowClick && 'cursor-pointer')}
                style={rowStyle(idx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.align === 'right' ? 'text-right' : undefined}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sorted.length === 0 && (
          <div className="rounded-b-lg border border-t-0 p-6 text-center text-sm text-muted-foreground">Ничего не найдено — измените фильтры.</div>
        )}
      </div>

      {/* Мобильный: карточки вместо таблицы — без горизонтальной прокрутки */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((row, idx) => (
          <div
            key={idx}
            className={cn(
              'animate-in fade-in slide-in-from-bottom-1 fill-mode-both rounded-xl border bg-card p-4 shadow-sm duration-300',
              onRowClick && 'cursor-pointer'
            )}
            style={rowStyle(idx)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
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
