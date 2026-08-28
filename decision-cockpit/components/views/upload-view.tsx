'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ParsedReport } from '@/lib/parse';

export function UploadView({
  onFile,
  data,
  filename,
  onOpenDashboard,
}: {
  onFile: (file: File) => void;
  data: ParsedReport | null;
  filename: string;
  onOpenDashboard: () => void;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-10">
      <div
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragOver ? 'border-primary bg-accent' : 'border-border bg-card'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <FileText className="mb-2 size-8 text-muted-foreground" />
        <div className="font-medium">Перетащите MD-файл отчёта сюда</div>
        <div className="text-xs text-muted-foreground">или</div>
        <Button className="mt-2" onClick={() => inputRef.current?.click()}>
          Выбрать файл
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".md,text/markdown"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>

      {data && (
        <Card className="w-full p-5">
          <div className="font-semibold">Файл загружен: {filename}</div>
          {(data.meta['Заголовок'] || data.meta['Дата отчёта']) && (
            <div className="text-sm text-muted-foreground">
              {[data.meta['Заголовок'], data.meta['Дата отчёта'] ? `дата отчёта: ${data.meta['Дата отчёта']}` : null]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          {data.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <div className="mb-1 font-semibold">Внимание — распознано не всё:</div>
              <ul className="list-inside list-disc space-y-0.5">
                {data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={onOpenDashboard}>Открыть дашборд</Button>
        </Card>
      )}
    </div>
  );
}
