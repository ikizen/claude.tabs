'use client';

// Одна строка = одно главное действие (headline) + максимум два маленьких
// предупреждающих значка. Если совпадений больше двух — показываем первые
// два по приоритету (качество данных > экономика > история), остальное
// доступно в детальной карточке по клику на строку.

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReportRow } from '@/lib/parse';

const HEADLINE_TONE: Record<string, string> = {
  'BUY MORE': 'bg-emerald-600 text-white',
  PUSH: 'bg-sky-600 text-white',
  HOLD: 'bg-slate-500 text-white',
  'STOP BUY': 'bg-orange-600 text-white',
  BUNDLE: 'bg-violet-600 text-white',
  DISCOUNT: 'bg-amber-600 text-white',
  LIQUIDATE: 'bg-red-600 text-white',
};

function headlineTone(headline: string): string {
  const base = headline.replace(/\*+$/, '').trim();
  return HEADLINE_TONE[base] ?? 'bg-muted text-muted-foreground';
}

export function HeadlineBadge({ headline }: { headline: string }) {
  const isCandidate = headline.trim().endsWith('*');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex w-fit shrink-0 cursor-help items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
            headlineTone(headline)
          )}
        >
          {headline || '—'}
        </span>
      </TooltipTrigger>
      <TooltipContent>{isCandidate ? 'Кандидат — требует проверки перед действием. Подробности по клику на строку.' : 'Подробности по клику на строку.'}</TooltipContent>
    </Tooltip>
  );
}

type WarningIcon = { icon: string; label: string };

export function warningIconsFor(row: ReportRow): WarningIcon[] {
  const icons: WarningIcon[] = [];
  if (row['flags_dataQuality'] && row['flags_dataQuality'] !== 'OK') {
    icons.push({ icon: '🔍', label: `Данные: требует проверки (${row['flags_dataQuality']})` });
  }
  if (row['flags_economics'] === 'PRICE FIX' && row['headline'] !== row['flags_economics']) {
    icons.push({ icon: '💰', label: 'Экономика: нужен пересмотр цены' });
  }
  if (row['flags_history'] && row['flags_history'] !== 'ENOUGH') {
    icons.push({ icon: '🕓', label: `История: ${row['flags_history'] === 'NEW' ? 'новинка, мало истории' : 'мало истории (THIN)'}` });
  }
  // Приоритет: качество данных > экономика > история — остальное в детальной карточке.
  return icons.slice(0, 2);
}

export function WarningIcons({ row }: { row: ReportRow }) {
  const icons = warningIconsFor(row);
  if (icons.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {icons.map((w, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <span className="cursor-help text-sm leading-none" aria-label={w.label}>
              {w.icon}
            </span>
          </TooltipTrigger>
          <TooltipContent>{w.label}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  );
}
