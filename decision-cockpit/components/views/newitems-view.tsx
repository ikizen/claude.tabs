'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/kpi-card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fmtMoney, fmtNumber } from '@/lib/format';
import type { ParsedReport, ReportRow } from '@/lib/parse';

const RISK_CLASS: Record<string, string> = {
  'низкий': 'border-l-emerald-500 bg-emerald-600',
  'средний': 'border-l-amber-500 bg-amber-600',
  'высокий': 'border-l-red-500 bg-red-600',
};

const BUCKETS = [
  { label: 'Сезон идёт сейчас', test: (m: number) => m === 0 },
  { label: 'Через 1–2 месяца', test: (m: number) => m >= 1 && m <= 2 },
  { label: 'Через 3–5 месяцев', test: (m: number) => m >= 3 && m <= 5 },
  { label: 'Через 6+ месяцев', test: (m: number) => m >= 6 },
];

function NewItemCard({ row }: { row: ReportRow }) {
  const riskClass = RISK_CLASS[String(row['Риск'])] ?? RISK_CLASS['средний'];
  const [borderClass, bgClass] = riskClass.split(' ');
  return (
    <div className={cn('rounded-xl border border-l-4 bg-muted/40 p-4', borderClass)}>
      <div className="font-semibold">{String(row['Модель'] ?? '')}</div>
      <div className="mb-3 text-xs text-muted-foreground">{String(row['Категория'] ?? '')}</div>
      <div className="mb-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Остаток</span>
          <span>
            {fmtNumber(row['Остаток_шт'])} шт · {fmtMoney(row['Остаток_тг'])}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Сезон с</span>
          <span>{String(row['Сезон_старт'] ?? '')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ожид. продажи</span>
          <span>{fmtNumber(row['Ожид_продажи_шт'])} шт</span>
        </div>
      </div>
      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white', bgClass)}>
        риск: {String(row['Риск'])}
      </span>
      {row['Комментарий'] && (
        <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">{String(row['Комментарий'])}</div>
      )}
    </div>
  );
}

export function NewItemsView({ data }: { data: ParsedReport }) {
  if (data.newitems.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Новинки в ожидании сезона</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const totalCount = data.newitems.length;
  const totalCapital = data.newitems.reduce((s, r) => s + (Number(r['Остаток_тг']) || 0), 0);
  const highRisk = data.newitems.filter((r) => r['Риск'] === 'высокий').length;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Новинки в ожидании сезона</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Всего новинок" value={fmtNumber(totalCount)} caption="позиций в ожидании сезона" />
        <KpiCard label="Капитал в новинках" value={fmtMoney(totalCapital)} caption="по себестоимости остатка" />
        <KpiCard label="Высокий риск" value={fmtNumber(highRisk)} caption="сезон дальше 6 месяцев" />
      </div>

      {BUCKETS.map((bucket, idx) => {
        const rows = data.newitems.filter((r) => bucket.test(Number(r['Мес_до_сезона'])));
        if (rows.length === 0) return null;
        return (
          <Collapsible key={bucket.label} defaultOpen={idx === 0} className="rounded-xl border bg-card">
            <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left font-semibold">
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              {bucket.label} ({rows.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row, i) => (
                  <NewItemCard key={i} row={row} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
        Эти позиции не являются неликвидом. Их сезон ещё не наступил. Не включать их в списки на уценку до окончания их окна продаж.
      </div>
    </div>
  );
}
