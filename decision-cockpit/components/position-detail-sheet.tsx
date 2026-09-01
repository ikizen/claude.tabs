'use client';

// Детальная карточка (bottom sheet) по клику на строку модели — показывает
// все пять флагов позиции и reasonCodes человеческим языком. Открывается
// поверх текущей вкладки, ничего не пересчитывает — только отображает уже
// посчитанные значения из отчёта.

import * as React from 'react';
import { X } from 'lucide-react';

import { fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import { FLAG_AXIS_LABELS, flagValueLabel, reasonCodeLabel, type FlagAxis } from '@/lib/status-labels';
import { HeadlineBadge } from '@/components/flag-badges';
import type { ReportRow } from '@/lib/parse';

const FLAG_AXES: FlagAxis[] = ['dataQuality', 'history', 'economics', 'confidence'];

export function PositionDetailSheet({ row, onClose }: { row: ReportRow; onClose: () => void }) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const headline = String(row['headline'] ?? row['Действие'] ?? '');
  const action = String(row['Действие'] ?? '');
  const reasonCodes = String(row['reasonCodes'] ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl border bg-card p-6 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="text-sm font-medium text-muted-foreground">{String(row['Модель'] ?? '')}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Рекомендуемое действие</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <HeadlineBadge headline={headline} />
        </div>
        {action && <p className="mt-2 text-sm">{action}</p>}

        <div className="mt-5 border-t pt-4">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Почему</div>
          <p className="mt-1 text-sm">
            Покрытие: {typeof row['Покрытие_сезонов'] === 'number' ? `${fmtNumber(row['Покрытие_сезонов'])} сезон.` : '—'} · Маржа:{' '}
            {typeof row['Маржа'] === 'number' ? fmtPercent(row['Маржа']) : '—'}
          </p>
        </div>

        <div className="mt-5 border-t pt-4">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Дополнительные сигналы</div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {FLAG_AXES.map((axis) => {
              const raw = String(row[`flags_${axis}`] ?? '');
              return (
                <React.Fragment key={axis}>
                  <dt className="text-muted-foreground">{FLAG_AXIS_LABELS[axis]}</dt>
                  <dd className="text-right font-medium">{raw ? flagValueLabel(axis, raw) : '—'}</dd>
                </React.Fragment>
              );
            })}
          </dl>
        </div>

        {reasonCodes.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Код причины</div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {reasonCodes.map((code) => (
                <li key={code}>
                  <span className="text-muted-foreground">{code}</span> — {reasonCodeLabel(code)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
          <span>Остаток</span>
          <span className="text-right">
            {fmtNumber(row['Остаток_шт'])} шт · {fmtMoney(row['Остаток_тг'])}
          </span>
          <span>Продано за 12 мес</span>
          <span className="text-right">{fmtNumber(row['Продано12'])} шт</span>
        </div>
      </div>
    </div>
  );
}
