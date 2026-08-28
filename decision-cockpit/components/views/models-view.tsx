'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { fmtNumber } from '@/lib/format';
import type { ParsedReport, ReportRow } from '@/lib/parse';

const ALL = '__all__';

export function ModelsView({ data }: { data: ParsedReport }) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [category, setCategory] = React.useState(ALL);

  if (data.models.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Модели</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  type ModelEntry = { row: ReportRow; effectiveStatus: string; isNewArrival: boolean };

  const newItemNames = new Set(data.newitems.map((r) => r['Модель']));
  const entries: ModelEntry[] = data.models.map((row) => {
    const isNewArrival = newItemNames.has(row['Модель']) && (row['Статус'] === 'DISCOUNT' || row['Статус'] === 'LIQUIDATE');
    return { row, effectiveStatus: isNewArrival ? 'NEW' : String(row['Статус']), isNewArrival };
  });

  const statuses = [...new Set(entries.map((r) => r.effectiveStatus).filter(Boolean))];
  const categories = [...new Set(data.models.map((r) => r['Категория']).filter(Boolean))] as string[];

  const filtered = entries.filter((entry) => {
    const r = entry.row;
    if (query && !String(r['Модель'] ?? '').toLowerCase().includes(query.toLowerCase())) return false;
    if (status !== ALL && entry.effectiveStatus !== status) return false;
    if (category !== ALL && r['Категория'] !== category) return false;
    return true;
  });

  const modelColumns = Object.keys(data.models[0]);
  const columns: DataTableColumn[] = modelColumns.map((key) => ({
    key,
    header: key,
    align: key === 'Статус' ? 'left' : typeof data.models[0][key] === 'number' ? 'right' : 'left',
    render: (row) => {
      if (key === 'Статус') {
        return <StatusBadge code={String(row['Статус'])} isNewArrival={Boolean(row['__isNewArrival'])} />;
      }
      const value = row[key];
      return typeof value === 'number' ? fmtNumber(value) : String(value ?? '');
    },
  }));

  const filteredRows: ReportRow[] = filtered.map((entry) => ({ ...entry.row, __isNewArrival: entry.isNewArrival ? 1 : 0 }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Модели</h2>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Поиск по модели…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все статусы</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все категории</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} rows={filteredRows} />
    </div>
  );
}
