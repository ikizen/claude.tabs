'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { fmtNumber } from '@/lib/format';
import { ABC_CLASS_INFO } from '@/lib/status-labels';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ParsedReport, ReportRow } from '@/lib/parse';

function monthColumnsOf(row: ReportRow): string[] {
  const months = new Set<string>();
  Object.keys(row).forEach((key) => {
    const m = key.match(/^(?:Расход|Остаток)_(\d{4}-\d{2})$/);
    if (m) months.add(m[1]);
  });
  return [...months].sort();
}

const ABC_CLASS: Record<string, string> = { A: 'bg-emerald-600', B: 'bg-amber-600', C: 'bg-slate-500' };

function AbcBadge({ cls }: { cls: unknown }) {
  const key = String(cls ?? '');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex cursor-help rounded-full px-2.5 py-0.5 text-xs font-semibold text-white', ABC_CLASS[key] ?? 'bg-muted')}>
          {key || '—'}
        </span>
      </TooltipTrigger>
      <TooltipContent>{ABC_CLASS_INFO[key] ?? 'Класс не указан.'}</TooltipContent>
    </Tooltip>
  );
}

function BuyBadge({ value }: { value: unknown }) {
  const yes = String(value).toLowerCase() === 'да';
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white', yes ? 'bg-emerald-600' : 'bg-slate-500')}>
      {String(value ?? '—')}
    </span>
  );
}

function ProcRow({ row, months, isCategory, expandable, open, onToggle, hidden }: {
  row: ReportRow;
  months: string[];
  isCategory: boolean;
  expandable?: boolean;
  open?: boolean;
  onToggle?: () => void;
  hidden?: boolean;
}) {
  return (
    <TableRow
      className={cn(hidden && 'hidden', expandable && 'cursor-pointer')}
      onClick={expandable ? onToggle : undefined}
    >
      <TableCell className={cn('font-medium', !isCategory && 'pl-8 font-normal text-muted-foreground')}>
        <span className="inline-flex items-center gap-2">
          {expandable && (
            <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
          )}
          {isCategory ? String(row['Категория'] ?? '') : String(row['Подкатегория'] ?? '')}
        </span>
      </TableCell>
      {months.map((m) => (
        <TableCell key={m} className="text-right text-xs whitespace-nowrap">
          <div>{fmtNumber(row[`Расход_${m}`])}</div>
          <div className="text-muted-foreground">{fmtNumber(row[`Остаток_${m}`])}</div>
        </TableCell>
      ))}
      <TableCell>
        <BuyBadge value={row['Закупать']} />
      </TableCell>
      <TableCell>{String(row['Сезон'] ?? '')}</TableCell>
      <TableCell className="text-right">{fmtNumber(row['Норма_мес'])}</TableCell>
      <TableCell className="text-right">{fmtNumber(row['Заказ_шт'])}</TableCell>
      <TableCell>
        <AbcBadge cls={row['Класс_ABC']} />
      </TableCell>
    </TableRow>
  );
}

export function ProcurementView({ data }: { data: ParsedReport }) {
  const [openCats, setOpenCats] = React.useState<Set<number>>(new Set());

  if (data.procurement.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Закуп</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const months = monthColumnsOf(data.procurement[0]);
  const categoryRows = data.procurement.filter((r) => !r['Подкатегория']);
  const subsByCategory = new Map<string, ReportRow[]>();
  data.procurement
    .filter((r) => r['Подкатегория'])
    .forEach((r) => {
      const key = String(r['Категория']);
      subsByCategory.set(key, [...(subsByCategory.get(key) ?? []), r]);
    });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Закуп</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Категория / Подкатегория</TableHead>
            {months.map((m) => (
              <TableHead key={m} className="text-right">
                {m}
              </TableHead>
            ))}
            <TableHead>Закупать</TableHead>
            <TableHead>Сезон</TableHead>
            <TableHead className="text-right">Норма, мес</TableHead>
            <TableHead className="text-right">Заказ, шт</TableHead>
            <TableHead>Класс</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categoryRows.map((catRow, i) => {
            const subs = subsByCategory.get(String(catRow['Категория'])) ?? [];
            const open = openCats.has(i);
            return (
              <React.Fragment key={i}>
                <ProcRow
                  row={catRow}
                  months={months}
                  isCategory
                  expandable={subs.length > 0}
                  open={open}
                  onToggle={() =>
                    setOpenCats((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                />
                {subs.map((sub, j) => (
                  <ProcRow key={j} row={sub} months={months} isCategory={false} hidden={!open} />
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
        Класс A — держим наличие всегда, B — по плану, C — под заказ или вывод из ассортимента.
      </div>
    </div>
  );
}
