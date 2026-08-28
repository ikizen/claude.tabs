import { marked } from 'marked';
import type { ParsedReport } from '@/lib/parse';

export function NarrativeView({ data }: { data: ParsedReport }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Методика</h2>
      {!data.narrative ? (
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      ) : (
        <div
          className="prose prose-sm dark:prose-invert max-w-none rounded-xl border bg-card p-6"
          dangerouslySetInnerHTML={{ __html: marked.parse(data.narrative) as string }}
        />
      )}
    </div>
  );
}
