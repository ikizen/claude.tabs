'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { HeadlineBadge, WarningIcons } from '@/components/flag-badges';
import { PositionDetailSheet } from '@/components/position-detail-sheet';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { FLAG_AXIS_LABELS, flagValueLabel, type FlagAxis } from '@/lib/status-labels';
import type { ParsedReport, ReportRow } from '@/lib/parse';

const ALL = '__all__';
const FLAG_AXES: FlagAxis[] = ['dataQuality', 'history', 'economics', 'confidence'];

export type FlagFilterRequest = { axis: FlagAxis; value: string };

// Старый вид — один бейдж статуса на строку. Используется, когда отчёт не
// содержит productTree (schema_version < 3 или JSON-секция не распознана) —
// полная обратная совместимость, код не менялся.
function LegacyModelsView({ data }: { data: ParsedReport }) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [category, setCategory] = React.useState(ALL);

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
        <Input placeholder="Поиск по модели…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
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

// Новый вид — headline-бейдж + до двух предупреждающих значков, детальная
// карточка по клику и фильтры по всем пяти флагам (комбинируются через И).
// Используется, когда отчёт содержит productTree (schema_version >= 3).
function FlagsModelsView({
  data,
  initialFlagFilter,
  onConsumeFlagFilter,
}: {
  data: ParsedReport;
  initialFlagFilter?: FlagFilterRequest | null;
  onConsumeFlagFilter?: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState(ALL);
  const [flagFilters, setFlagFilters] = React.useState<Record<FlagAxis, string>>({
    dataQuality: ALL,
    history: ALL,
    economics: ALL,
    confidence: ALL,
  });
  const [detailRow, setDetailRow] = React.useState<ReportRow | null>(null);

  React.useEffect(() => {
    if (initialFlagFilter) {
      setFlagFilters((prev) => ({ ...prev, [initialFlagFilter.axis]: initialFlagFilter.value }));
      onConsumeFlagFilter?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFlagFilter]);

  const categories = [...new Set(data.models.map((r) => r['Категория']).filter(Boolean))] as string[];
  const flagValues: Record<FlagAxis, string[]> = {
    dataQuality: [],
    history: [],
    economics: [],
    confidence: [],
  };
  FLAG_AXES.forEach((axis) => {
    flagValues[axis] = [...new Set(data.models.map((r) => String(r[`flags_${axis}`] ?? '')).filter(Boolean))];
  });

  const filtered = data.models.filter((row) => {
    if (query && !String(row['Модель'] ?? '').toLowerCase().includes(query.toLowerCase())) return false;
    if (category !== ALL && row['Категория'] !== category) return false;
    return FLAG_AXES.every((axis) => flagFilters[axis] === ALL || row[`flags_${axis}`] === flagFilters[axis]);
  });

  const activeFlagCount = FLAG_AXES.filter((axis) => flagFilters[axis] !== ALL).length;

  const columns: DataTableColumn[] = [
    {
      key: 'Модель',
      header: 'Модель',
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="truncate">{String(row['Модель'] ?? '')}</span>
          <WarningIcons row={row} />
        </span>
      ),
    },
    { key: 'Категория', header: 'Категория', hideOnMobile: true },
    { key: 'Подкатегория', header: 'Подкатегория', hideOnMobile: true },
    { key: 'Остаток_шт', header: 'Остаток, шт', align: 'right', render: (row) => fmtNumber(row['Остаток_шт']) },
    { key: 'Остаток_тг', header: 'Остаток, ₸', align: 'right', render: (row) => fmtNumber(row['Остаток_тг']) },
    { key: 'Продано12', header: 'Продано, 12 мес', align: 'right', render: (row) => fmtNumber(row['Продано12']) },
    {
      key: 'Маржа',
      header: 'Маржа',
      align: 'right',
      render: (row) => (typeof row['Маржа'] === 'number' ? fmtPercent(row['Маржа']) : '—'),
    },
    {
      key: 'Покрытие_сезонов',
      header: 'Покрытие, сезонов',
      align: 'right',
      render: (row) => (typeof row['Покрытие_сезонов'] === 'number' ? fmtNumber(row['Покрытие_сезонов']) : '—'),
    },
    {
      key: 'headline',
      header: 'Действие',
      filterable: false,
      render: (row) => <HeadlineBadge headline={String(row['headline'] ?? '')} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Модели</h2>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Поиск по модели…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
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
        {FLAG_AXES.map((axis) => (
          <Select key={axis} value={flagFilters[axis]} onValueChange={(v) => setFlagFilters((prev) => ({ ...prev, [axis]: v }))}>
            <SelectTrigger className="min-w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{FLAG_AXIS_LABELS[axis]}: все</SelectItem>
              {flagValues[axis].map((v) => (
                <SelectItem key={v} value={v}>
                  {FLAG_AXIS_LABELS[axis]}: {flagValueLabel(axis, v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {activeFlagCount > 0 && (
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => setFlagFilters({ dataQuality: ALL, history: ALL, economics: ALL, confidence: ALL })}
          >
            сбросить фильтры флагов
          </button>
        )}
      </div>
      <DataTable columns={columns} rows={filtered} onRowClick={setDetailRow} />
      {detailRow && <PositionDetailSheet row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  );
}

export function ModelsView({
  data,
  initialFlagFilter,
  onConsumeFlagFilter,
}: {
  data: ParsedReport;
  initialFlagFilter?: FlagFilterRequest | null;
  onConsumeFlagFilter?: () => void;
}) {
  if (data.models.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Модели</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  if (data.productTree) {
    return <FlagsModelsView data={data} initialFlagFilter={initialFlagFilter} onConsumeFlagFilter={onConsumeFlagFilter} />;
  }

  return <LegacyModelsView data={data} />;
}
