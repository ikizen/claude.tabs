import { Card } from '@/components/ui/card';
import { SimpleBadge } from '@/components/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0 cursor-help text-right">
                    <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Потенц. эффект</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(row['Эффект_тг'])}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Ожидаемая денежная отдача от этого конкретного действия за 7 дней — посчитана в отчёте (не на сайте) по группе «
                  {String(row['Группа'] ?? '—')}».
                </TooltipContent>
              </Tooltip>
              <SimpleBadge text={String(row['Усилия'] ?? '')} />
            </Card>
          ))}
          <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
            «Потенц. эффект» — ожидаемая денежная отдача за 7 дней от выполнения именно этого действия (например, высвобождение капитала
            от уценки или экономия от остановки закупки). Считается в отчёте по факту продаж и остатков, сайт эти числа не пересчитывает,
            только показывает и сортирует по убыванию.
          </div>
        </div>
      )}
    </div>
  );
}
