'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { fmtNumber } from '@/lib/format';
import { Sparkline } from '@/components/sparkline';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ForecastNode } from '@/lib/forecast-tree';

const ACCURACY_TOOLTIP: Record<string, string> = {
  'средняя': 'Медианная ошибка прогноза на уровне подкатегории — 32%, доверять с оговорками.',
  'низкая': 'Медианная ошибка прогноза по отдельной позиции — 100%, использовать только как ориентир.',
};

function ForecastValue({ row, horizon }: { row: ForecastNode['row']; horizon: string }) {
  const accuracy = String(row['Точность'] ?? '');
  const value = row[`Прогноз_${horizon}м`];
  const text = typeof value === 'number' ? `${fmtNumber(value)} шт` : '—';

  const className = cn(
    'tabular-nums whitespace-nowrap text-sm',
    accuracy === 'высокая' && 'font-semibold text-foreground',
    accuracy === 'средняя' && 'text-muted-foreground',
    accuracy === 'низкая' && 'text-muted-foreground/70'
  );

  const content = (
    <span className={className}>
      {accuracy === 'средняя' && <span className="mr-1">~</span>}
      {accuracy === 'низкая' && <span className="mr-1 text-red-500">⚠</span>}
      {text}
    </span>
  );

  if (ACCURACY_TOOLTIP[accuracy]) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{content}</span>
        </TooltipTrigger>
        <TooltipContent>{ACCURACY_TOOLTIP[accuracy]}</TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

function TrendBadge({ trend }: { trend: unknown }) {
  if (typeof trend !== 'number') return <span className="text-xs text-muted-foreground">—</span>;
  const pct = (trend - 1) * 100;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        up ? 'bg-emerald-600/10 text-emerald-600' : 'bg-red-600/10 text-red-600'
      )}
    >
      {up ? '+' : ''}
      {pct.toFixed(0)}%
    </span>
  );
}

export function ForecastTreeNode({ node, depth, horizon }: { node: ForecastNode; depth: number; horizon: string }) {
  const [open, setOpen] = React.useState(false);
  const hasChildren = node.children.length > 0;
  const level = String(node.row['Уровень'] ?? '');

  const row = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5',
        depth === 0 && 'font-semibold',
        depth === 1 && 'ml-6 text-sm',
        depth === 2 && 'ml-12 text-sm text-muted-foreground',
        hasChildren && 'cursor-pointer'
      )}
    >
      {hasChildren ? (
        <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{String(node.row['Объект'] ?? '')}</span>
      {level === 'категория' && <Sparkline row={node.row} />}
      {level && <TrendBadge trend={node.row['Тренд']} />}
      {level && <ForecastValue row={node.row} horizon={horizon} />}
    </div>
  );

  if (!hasChildren) return row;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>{row}</CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
        <div className="mt-1 flex flex-col gap-1">
          {node.children.map((child, i) => (
            <ForecastTreeNode key={i} node={child} depth={depth + 1} horizon={horizon} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
