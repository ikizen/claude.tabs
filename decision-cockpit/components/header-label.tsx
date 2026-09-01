import { HelpCircle } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { glossaryFor } from '@/lib/glossary';

// Заголовок столбца с подсказкой-объяснением термина при наведении, если
// для него есть статья в глоссарии (GMROI, DOS, Класс ABC и т.д.).
export function HeaderLabel({ label, glossaryKey }: { label: string; glossaryKey?: string }) {
  const term = glossaryFor(glossaryKey ?? label) ?? glossaryFor(label);
  if (!term) return <span>{label}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1 border-b border-dotted border-muted-foreground/50">
          {label}
          <HelpCircle className="size-3 opacity-60" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{term}</TooltipContent>
    </Tooltip>
  );
}
