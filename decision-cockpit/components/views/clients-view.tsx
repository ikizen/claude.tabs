'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/kpi-card';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';

const STATUSES = ['растёт', 'стабилен', 'падает', 'новый', 'ушёл'];
const ALL = '__all__';

const STATUS_CLASS: Record<string, string> = {
  'растёт': 'bg-emerald-600',
  'стабилен': 'bg-slate-500',
  'падает': 'bg-red-600',
  'новый': 'bg-sky-600',
  'ушёл': 'bg-stone-500',
};

function ClientStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white', STATUS_CLASS[status] ?? 'bg-muted')}>
      {status}
    </span>
  );
}

export function ClientsView({ data }: { data: ParsedReport }) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState(ALL);

  if (data.clients.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Клиенты</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const total = data.clients.length;
  const churned = data.clients.filter((r) => r['Статус'] === 'ушёл').length;
  const isNew = data.clients.filter((r) => r['Статус'] === 'новый').length;
  const active = total - churned;
  const retentionRow = data.retention.find((r) => String(r['Показатель'] ?? '').includes('Выручка ушедших'));
  const churnedRevenue = retentionRow
    ? Number(retentionRow['Значение']) || 0
    : data.clients.filter((r) => r['Статус'] === 'ушёл').reduce((s, r) => s + (Number(r['Оборот_пред']) || 0), 0);

  const filtered = data.clients.filter((r) => {
    if (status !== ALL && r['Статус'] !== status) return false;
    if (query && !String(r['Клиент'] ?? '').toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const columns: DataTableColumn[] = Object.keys(data.clients[0]).map((key) => ({
    key,
    header: key,
    align: ['Оборот_пред', 'Оборот_тек', 'Оценка_ВП', 'Дельта', 'Маржа'].includes(key) ? 'right' : 'left',
    render: (r) => {
      const value = r[key];
      if (key === 'Статус') return <ClientStatusBadge status={String(value)} />;
      if (['Оборот_пред', 'Оборот_тек', 'Оценка_ВП'].includes(key)) return fmtMoney(value);
      if (['Дельта', 'Маржа'].includes(key)) return fmtPercent(value);
      return typeof value === 'number' ? fmtNumber(value) : String(value ?? '');
    },
  }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Клиенты</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Всего клиентов" value={fmtNumber(total)} caption="в загруженном срезе" />
        <KpiCard label="Активных" value={fmtNumber(active)} caption="не помечены как ушедшие" />
        <KpiCard label="Ушедших" value={fmtNumber(churned)} />
        <KpiCard label="Новых" value={fmtNumber(isNew)} />
        <KpiCard label="Оборот ушедших" value={fmtMoney(churnedRevenue)} caption="их оборот в прошлом периоде" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Поиск по клиенту…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v)}>
          <ToggleGroupItem value={ALL}>Все</ToggleGroupItem>
          {STATUSES.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {s}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <DataTable columns={columns} rows={filtered} />

      {data.retention.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground">Отток</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {data.retention.map((r, i) => (
              <KpiCard key={i} label={String(r['Показатель'] ?? '')} value={fmtNumber(r['Значение'])} caption={String(r['Подпись'] ?? '')} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
