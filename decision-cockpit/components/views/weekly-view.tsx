'use client';

import * as React from 'react';

import { KpiCard } from '@/components/kpi-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ParsedReport } from '@/lib/parse';

function DeltaBadge({ fraction }: { fraction: unknown }) {
  if (typeof fraction !== 'number') return <span className="text-muted-foreground">—</span>;
  const pct = fraction * 100;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        up ? 'bg-emerald-600/10 text-emerald-600' : 'bg-red-600/10 text-red-600'
      )}
    >
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

const ALL = 'ALL';

export function WeeklyView({ data }: { data: ParsedReport }) {
  const categories = [...new Set(data.weekly.map((r) => r['Категория']).filter(Boolean))] as string[];
  const ordered = categories.includes(ALL) ? [ALL, ...categories.filter((c) => c !== ALL).sort()] : categories.sort();
  const [category, setCategory] = React.useState(ordered[0] ?? ALL);
  const [depth, setDepth] = React.useState('8');

  if (data.weekly.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Недельная динамика</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const rows = [...data.weekly]
    .filter((r) => r['Категория'] === category)
    .sort((a, b) => String(a['Неделя']).localeCompare(String(b['Неделя'])));
  const depthN = Number(depth);
  const visible = depthN > 0 ? rows.slice(-depthN) : rows;
  const chronoDesc = [...visible].reverse();
  const latest = chronoDesc[0];

  const columns: DataTableColumn[] = [
    { key: 'Неделя', header: 'Неделя' },
    { key: 'Период', header: 'Период' },
    { key: 'Выручка', header: 'Выручка', align: 'right', render: (r) => fmtMoney(r['Выручка']) },
    { key: 'Вал_маржа', header: 'Вал. маржа', align: 'right', render: (r) => fmtMoney(r['Вал_маржа']) },
    { key: 'Маржинность', header: 'Маржинность', align: 'right', render: (r) => fmtPercent(r['Маржинность']) },
    { key: 'Продано_шт', header: 'Продано шт', align: 'right', render: (r) => fmtNumber(r['Продано_шт']) },
    { key: 'Документов', header: 'Документов', align: 'right', render: (r) => fmtNumber(r['Документов']) },
    { key: 'Средний_чек', header: 'Средний чек', align: 'right', render: (r) => fmtMoney(r['Средний_чек']) },
    { key: 'ДельтаВыручка_WoW', header: 'Δ WoW', align: 'right', render: (r) => <DeltaBadge fraction={r['ДельтаВыручка_WoW']} /> },
    { key: 'ДельтаВыручка_YoY', header: 'Δ YoY', align: 'right', render: (r) => <DeltaBadge fraction={r['ДельтаВыручка_YoY']} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Недельная динамика</h2>

      <div className="flex flex-wrap gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="min-w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ordered.map((c) => (
              <SelectItem key={c} value={c}>
                {c === ALL ? 'Все категории (итого)' : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={depth} onValueChange={setDepth}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">последние 8 недель</SelectItem>
            <SelectItem value="13">последние 13 недель</SelectItem>
            <SelectItem value="26">последние 26 недель</SelectItem>
            <SelectItem value="0">весь период</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {latest ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Выручка, последняя неделя" value={fmtMoney(latest['Выручка'])} caption={String(latest['Период'] ?? '')} />
          <KpiCard label="Вал. маржа" value={fmtMoney(latest['Вал_маржа'])} caption={String(latest['Неделя'] ?? '')} />
          <KpiCard label="Δ выручки к прошлой неделе" value={<DeltaBadge fraction={latest['ДельтаВыручка_WoW']} />} />
          <KpiCard
            label="Δ выручки год к году"
            value={<DeltaBadge fraction={latest['ДельтаВыручка_YoY']} />}
            caption="та же неделя прошлого года"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Нет недель для этого фильтра.</p>
      )}

      <h3 className="text-sm font-medium text-muted-foreground">По неделям</h3>
      <DataTable columns={columns} rows={chronoDesc} />
    </div>
  );
}
