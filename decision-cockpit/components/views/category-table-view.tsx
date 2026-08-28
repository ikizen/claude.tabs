'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { fmtNumber } from '@/lib/format';
import type { ReportRow } from '@/lib/parse';

export function CategoryTableView({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: ReportRow[];
  emptyMessage: string;
}) {
  const [query, setQuery] = React.useState('');

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const nameCol = Object.keys(rows[0])[0];
  const filtered = query
    ? rows.filter((r) => String(r[nameCol] ?? '').toLowerCase().includes(query.toLowerCase()))
    : rows;

  const columns: DataTableColumn[] = Object.keys(rows[0]).map((key) => ({
    key,
    header: key,
    align: key === nameCol || key === 'Статус' || key === 'Действие' ? 'left' : 'right',
    render: (r) => {
      const value = r[key];
      if (key === 'Статус') return <StatusBadge code={String(value)} />;
      return typeof value === 'number' ? fmtNumber(value) : String(value ?? '');
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <Input
        placeholder="Поиск по названию…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />
      <DataTable columns={columns} rows={filtered} />
    </div>
  );
}
