'use client';

import { cn } from '@/lib/utils';
import { statusInfo, NEW_ARRIVAL_STATUS, type StatusTone } from '@/lib/status-labels';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const TONE_CLASS: Record<StatusTone, string> = {
  buy: 'bg-emerald-600 text-white',
  push: 'bg-sky-600 text-white',
  hold: 'bg-slate-500 text-white',
  stopbuy: 'bg-orange-600 text-white',
  bundle: 'bg-violet-600 text-white',
  discount: 'bg-amber-600 text-white',
  liquidate: 'bg-red-600 text-white',
  newarrival: 'bg-blue-600 text-white',
  neutral: 'bg-muted text-muted-foreground',
};

export function statusBarClass(code: string): string {
  return TONE_CLASS[statusInfo(code).tone] ?? TONE_CLASS.neutral;
}

export function StatusBadge({ code, isNewArrival = false }: { code: string; isNewArrival?: boolean }) {
  const info = isNewArrival ? NEW_ARRIVAL_STATUS : statusInfo(code);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex w-fit shrink-0 cursor-help items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
            TONE_CLASS[info.tone]
          )}
        >
          {info.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">
          {isNewArrival ? `Код в отчёте: ${code}` : code}
        </p>
        {info.description && <p className="mt-1 text-muted-foreground">{info.description}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

const SIMPLE_TONE_CLASS: Record<string, string> = {
  'низкий': 'bg-emerald-600 text-white',
  'средний': 'bg-amber-600 text-white',
  'высокий': 'bg-red-600 text-white',
  'низкие': 'bg-emerald-600 text-white',
  'средние': 'bg-amber-600 text-white',
  'высокие': 'bg-red-600 text-white',
};

export function SimpleBadge({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        SIMPLE_TONE_CLASS[text] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {text}
    </span>
  );
}
