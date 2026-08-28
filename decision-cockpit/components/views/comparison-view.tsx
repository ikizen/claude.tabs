import { cn } from '@/lib/utils';
import { fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportRow } from '@/lib/parse';

const METRIC_FORMAT: Record<string, 'money' | 'percent' | 'count'> = {
  'Чеков': 'count',
  'Средний чек': 'money',
  'Выручка': 'money',
  'Валовая маржа': 'money',
  'Маржинальность': 'percent',
};

function formatMetric(metric: string, value: unknown) {
  const kind = METRIC_FORMAT[metric] ?? 'count';
  if (typeof value !== 'number') return String(value ?? '—');
  if (kind === 'money') return fmtMoney(value);
  if (kind === 'percent') return fmtPercent(value);
  return fmtNumber(value);
}

function DeltaCell({ value, prev }: { value: unknown; prev: unknown }) {
  if (typeof value !== 'number' || typeof prev !== 'number' || prev === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const delta = (value - prev) / Math.abs(prev);
  const up = delta >= 0;
  return (
    <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-semibold', up ? 'bg-emerald-600/10 text-emerald-600' : 'bg-red-600/10 text-red-600')}>
      {up ? '+' : ''}
      {(delta * 100).toFixed(1)}%
    </span>
  );
}

// Дельта к соседнему периоду — тривиальная арифметика на уже данных числах,
// считается в браузере (не бизнес-решение, просто отображение), в отдельной
// таблице ниже основных значений.
export function ComparisonView({ title, rows, transpose = false }: { title: string; rows: ReportRow[]; transpose?: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const allColumns = Object.keys(rows[0]);
  const metricCol = allColumns[0];
  const periods = allColumns.slice(1);
  const metrics = rows.map((r) => String(r[metricCol]));

  function valueAt(period: string, metric: string): unknown {
    const row = rows.find((r) => String(r[metricCol]) === metric);
    return row ? row[period] : undefined;
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Значения</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{transpose ? 'Период' : metricCol}</TableHead>
              {(transpose ? metrics : periods).map((c) => (
                <TableHead key={c} className="text-right">
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(transpose ? periods : metrics).map((rowLabel) => (
              <TableRow key={rowLabel}>
                <TableCell className="bg-muted/40 font-semibold">{rowLabel}</TableCell>
                {(transpose ? metrics : periods).map((colLabel) => {
                  const period = transpose ? rowLabel : colLabel;
                  const metric = transpose ? colLabel : rowLabel;
                  return (
                    <TableCell key={colLabel} className="text-right tabular-nums whitespace-nowrap">
                      {formatMetric(metric, valueAt(period, metric))}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Изменения к предыдущему периоду, %</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{transpose ? 'Период' : metricCol}</TableHead>
              {(transpose ? metrics : periods.slice(1)).map((c) => (
                <TableHead key={c} className="text-right">
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(transpose ? periods.slice(1) : metrics).map((rowLabel) => (
              <TableRow key={rowLabel}>
                <TableCell className="bg-muted/40 font-semibold">{rowLabel}</TableCell>
                {(transpose ? metrics : periods.slice(1)).map((colLabel) => {
                  if (transpose) {
                    const period = rowLabel;
                    const prevPeriod = periods[periods.indexOf(rowLabel) - 1];
                    const metric = colLabel;
                    return (
                      <TableCell key={colLabel} className="text-right">
                        <DeltaCell value={valueAt(period, metric)} prev={valueAt(prevPeriod, metric)} />
                      </TableCell>
                    );
                  }
                  const metric = rowLabel;
                  const period = colLabel;
                  const prevPeriod = periods[periods.indexOf(colLabel) - 1];
                  return (
                    <TableCell key={colLabel} className="text-right">
                      <DeltaCell value={valueAt(period, metric)} prev={valueAt(prevPeriod, metric)} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
