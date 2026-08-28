import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type Tone = 'good' | 'bad' | 'neutral';

const TONE_BORDER: Record<Tone, string> = {
  good: 'border-l-emerald-500',
  bad: 'border-l-red-500',
  neutral: 'border-l-muted-foreground/40',
};

export function KpiCard({
  label,
  value,
  caption,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card className={cn('gap-1 border-l-4 py-4', TONE_BORDER[tone], className)}>
      <div className="px-5 text-xs text-muted-foreground">{label}</div>
      <div className="px-5 text-2xl font-semibold tabular-nums">{value}</div>
      {caption && <div className="px-5 text-xs text-muted-foreground">{caption}</div>}
    </Card>
  );
}
