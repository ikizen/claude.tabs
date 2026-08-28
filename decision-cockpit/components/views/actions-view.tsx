import { Card } from '@/components/ui/card';
import { SimpleBadge } from '@/components/status-badge';
import { fmtMoney } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';

export function ActionsView({ data }: { data: ParsedReport }) {
  const sorted = [...data.actions7d].sort((a, b) => (Number(b['Эффект_тг']) || 0) - (Number(a['Эффект_тг']) || 0));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Действия на 7 дней</h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((row, i) => (
            <Card key={i} className="flex-row items-center gap-4 p-4">
              <div className="w-8 shrink-0 font-bold text-muted-foreground">#{String(row['Приоритет'] ?? '')}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{String(row['Действие'] ?? '')}</div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  {row['Группа'] && <span>{String(row['Группа'])}</span>}
                  {row['Кто'] && <span>{String(row['Кто'])}</span>}
                </div>
              </div>
              <div className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(row['Эффект_тг'])}</div>
              <SimpleBadge text={String(row['Усилия'] ?? '')} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
