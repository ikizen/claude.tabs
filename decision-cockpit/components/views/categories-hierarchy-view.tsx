'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { HeaderLabel } from '@/components/header-label';
import { fmtNumber, numericPrefix } from '@/lib/format';
import type { ReportRow } from '@/lib/parse';

// Подкатегории группируются под категорию по числовому префиксу в названии
// (например "2.7 - ..." принадлежит категории "2 - ..."), той же схемой,
// что дерево прогноза и таблица закупа.
export function CategoriesHierarchyView({ categories, subcategories }: { categories: ReportRow[]; subcategories: ReportRow[] }) {
  const [query, setQuery] = React.useState('');
  const [openCats, setOpenCats] = React.useState<Set<number>>(new Set());

  if (categories.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Категории</h2>
        <p className="text-sm text-muted-foreground">Нет данных по категориям.</p>
      </div>
    );
  }

  const columns = Object.keys(categories[0]);
  const nameCol = columns[0];

  const subsByCategoryPrefix = new Map<string, ReportRow[]>();
  subcategories.forEach((sub) => {
    const prefix = numericPrefix(sub[nameCol]);
    const parentPrefix = prefix?.includes('.') ? prefix.split('.')[0] : null;
    if (!parentPrefix) return;
    const list = subsByCategoryPrefix.get(parentPrefix) ?? [];
    list.push(sub);
    subsByCategoryPrefix.set(parentPrefix, list);
  });

  const q = query.trim().toLowerCase();
  function matches(row: ReportRow) {
    return !q || String(row[nameCol] ?? '').toLowerCase().includes(q);
  }

  function cellContent(col: string, value: unknown) {
    if (col === 'Статус') return <StatusBadge code={String(value)} />;
    return typeof value === 'number' ? fmtNumber(value) : String(value ?? '');
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Категории</h2>
      <Input placeholder="Поиск по названию…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c} className={c === nameCol ? undefined : 'text-right'}>
                <HeaderLabel label={c} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat, i) => {
            const prefix = numericPrefix(cat[nameCol]);
            const subs = (prefix && subsByCategoryPrefix.get(prefix)) || [];
            const visibleSubs = subs.filter(matches);
            const catMatches = matches(cat);
            if (!catMatches && visibleSubs.length === 0) return null;
            const open = openCats.has(i) || (q !== '' && visibleSubs.length > 0);

            return (
              <React.Fragment key={i}>
                <TableRow
                  className={cn(subs.length > 0 && 'cursor-pointer', 'font-medium')}
                  onClick={() =>
                    subs.length > 0 &&
                    setOpenCats((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                >
                  {columns.map((col) => (
                    <TableCell key={col} className={col === nameCol ? undefined : 'text-right'}>
                      {col === nameCol ? (
                        <span className="inline-flex items-center gap-2">
                          {subs.length > 0 ? (
                            <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
                          ) : (
                            <span className="inline-block w-4 shrink-0" />
                          )}
                          {cellContent(col, cat[col])}
                          {subs.length > 0 && <span className="text-xs font-normal text-muted-foreground">({subs.length})</span>}
                        </span>
                      ) : (
                        cellContent(col, cat[col])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {open &&
                  visibleSubs.map((sub, j) => (
                    <TableRow key={j} className="bg-muted/30">
                      {columns.map((col) => (
                        <TableCell key={col} className={cn(col === nameCol ? 'pl-10 font-normal text-muted-foreground' : 'text-right')}>
                          {cellContent(col, sub[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
