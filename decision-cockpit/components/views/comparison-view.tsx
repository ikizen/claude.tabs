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
  if (typeof value !== 'number') return String(value ?? '');
  if (kind === 'money') return fmtMoney(value);
  if (kind === 'percent') return fmtPercent(value);
  return fmtNumber(value);
}

// Дельта к соседнему периоду — тривиальная арифметика на уже данных числах,
// считается в браузере (не бизнес-решение, просто отображение).
export function ComparisonView({ title, rows }: { title: string; rows: ReportRow[] }) {
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
  const periodCols = allColumns.slice(1);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{metricCol}</TableHead>
            {periodCols.map((p) => (
              <TableHead key={p} className="text-right">
                {p}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="bg-muted/40 font-semibold">{String(row[metricCol] ?? '')}</TableCell>
              {periodCols.map((period, idx) => {
                const value = row[period];
                const prevValue = idx > 0 ? row[periodCols[idx - 1]] : null;
                const hasDelta = typeof value === 'number' && typeof prevValue === 'number' && prevValue !== 0;
                const delta = hasDelta ? (Number(value) - Number(prevValue)) / Math.abs(Number(prevValue)) : null;
                return (
                  <TableCell key={period} className="text-right whitespace-nowrap">
                    {formatMetric(String(row[metricCol]), value)}
                    {delta !== null && (
                      <span
                        className={cn(
                          'ml-2 rounded-md px-1.5 py-0.5 text-xs font-semibold',
                          delta >= 0 ? 'bg-emerald-600/10 text-emerald-600' : 'bg-red-600/10 text-red-600'
                        )}
                      >
                        {delta >= 0 ? '+' : ''}
                        {(delta * 100).toFixed(1)}%
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
