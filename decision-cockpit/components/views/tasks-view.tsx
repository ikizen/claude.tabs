'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { ParsedReport, ReportRow } from '@/lib/parse';

const COLUMNS = ['Предложено', 'К работе', 'В работе', 'Готово'] as const;
type Column = (typeof COLUMNS)[number];

const PRIORITY_CLASS: Record<string, string> = {
  'высокий': 'bg-red-500',
  'средний': 'bg-amber-500',
  'низкий': 'bg-emerald-500',
};

const STORAGE_KEY = 'decision-cockpit:tasks-state';

type TaskItem = { row: ReportRow; id: string; column: Column };

function taskId(row: ReportRow, index: number) {
  return `${index}:${String(row['Задача'] ?? '').slice(0, 40)}`;
}

function loadState(): Record<string, { column: string }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveState(state: Record<string, { column: string }>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage недоступен — состояние доски просто не сохранится
  }
}

export function TasksView({ data }: { data: ParsedReport }) {
  const [items, setItems] = React.useState<TaskItem[]>([]);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<Column | null>(null);

  React.useEffect(() => {
    const state = loadState();
    setItems(
      data.tasks.map((row, index) => {
        const id = taskId(row, index);
        const saved = state[id]?.column;
        const column = (saved && (COLUMNS as readonly string[]).includes(saved) ? saved : row['Колонка']) as Column;
        return { row, id, column };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tasks]);

  function moveTo(id: string, column: Column) {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, column } : item));
      const stateToSave: Record<string, { column: string }> = {};
      next.forEach((item) => {
        stateToSave[item.id] = { column: item.column };
      });
      saveState(stateToSave);
      return next;
    });
  }

  if (data.tasks.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Задачи</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  const total = items.length;
  const done = items.filter((i) => i.column === 'Готово').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Задачи</h2>

      <div className="flex items-center gap-4">
        <Progress value={pct} className="max-w-xs" />
        <span className="text-sm text-muted-foreground">
          Готово {done} из {total} задач · {pct}%
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.column === col);
          return (
            <div
              key={col}
              className={cn(
                'flex min-h-[140px] flex-col gap-2 rounded-xl border bg-card p-3 transition-colors',
                overCol === col && 'border-primary bg-accent/40'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col);
              }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragId) moveTo(dragId, col);
              }}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <span>{col}</span>
                <span>{colItems.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      'relative cursor-grab rounded-lg border bg-muted/30 p-3 pl-4',
                      dragId === item.id && 'opacity-40'
                    )}
                  >
                    <span
                      className={cn('absolute top-2 bottom-2 left-0 w-1 rounded-full', PRIORITY_CLASS[String(item.row['Приоритет'])] ?? 'bg-slate-400')}
                    />
                    <div className="mb-1.5 text-sm font-semibold">{String(item.row['Задача'] ?? '')}</div>
                    <div className="mb-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {item.row['Кто'] && <span>{String(item.row['Кто'])}</span>}
                      {item.row['Срок'] && <span>{String(item.row['Срок'])}</span>}
                    </div>
                    {item.row['Комментарий'] && (
                      <div className="mb-2 text-xs text-muted-foreground">{String(item.row['Комментарий'])}</div>
                    )}
                    <Label className="text-xs">
                      <Checkbox
                        checked={item.column === 'Готово'}
                        onCheckedChange={(checked) => moveTo(item.id, checked ? 'Готово' : 'К работе')}
                      />
                      Готово
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
