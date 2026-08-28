'use client';

import * as React from 'react';
import { marked } from 'marked';

import { ThemeToggle } from '@/components/theme-toggle';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UploadView } from '@/components/views/upload-view';
import { OverviewView } from '@/components/views/overview-view';
import { ActionsView } from '@/components/views/actions-view';
import { WeeklyView } from '@/components/views/weekly-view';
import { ForecastView } from '@/components/views/forecast-view';
import { NewItemsView } from '@/components/views/newitems-view';
import { ComparisonView } from '@/components/views/comparison-view';
import { DeficitView } from '@/components/views/deficit-view';
import { ProcurementView } from '@/components/views/procurement-view';
import { CategoryTableView } from '@/components/views/category-table-view';
import { ModelsView } from '@/components/views/models-view';
import { ClientsView } from '@/components/views/clients-view';
import { DataQualityView } from '@/components/views/dataquality-view';
import { TasksView } from '@/components/views/tasks-view';
import { NarrativeView } from '@/components/views/narrative-view';
import { parseReport, type ParsedReport } from '@/lib/parse';
import { visibleTabs, type TabId } from '@/lib/tabs';

export default function Home() {
  const [data, setData] = React.useState<ParsedReport | null>(null);
  const [filename, setFilename] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<TabId>('upload');
  const [unrecognizedMarkdown, setUnrecognizedMarkdown] = React.useState<string | null>(null);
  const [compact, setCompact] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 8);
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      setFilename(file.name);
      const parsed = parseReport(text);
      if (!parsed.recognized) {
        setUnrecognizedMarkdown(text);
        setData(null);
        return;
      }
      setUnrecognizedMarkdown(null);
      setData(parsed);
      setActiveTab('upload');
    };
    reader.readAsText(file);
  }

  const tabs = visibleTabs(data);
  const reportTitle = data ? (data.meta['Заголовок'] as string) || filename : '';

  function renderActive() {
    if (unrecognizedMarkdown) {
      return (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Не удалось распознать структуру</h2>
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Файл не соответствует контракту и заголовки не найдены. Показываем как обычный markdown.
          </p>
          <div
            className="prose prose-sm dark:prose-invert max-w-none rounded-xl border bg-card p-6"
            dangerouslySetInnerHTML={{ __html: marked.parse(unrecognizedMarkdown) as string }}
          />
        </div>
      );
    }
    if (!data || activeTab === 'upload') {
      return (
        <UploadView data={data} filename={filename} onFile={handleFile} onOpenDashboard={() => setActiveTab('overview')} />
      );
    }
    switch (activeTab) {
      case 'overview':
        return <OverviewView data={data} />;
      case 'actions7d':
        return <ActionsView data={data} />;
      case 'weekly':
        return <WeeklyView data={data} />;
      case 'forecast':
        return <ForecastView data={data} />;
      case 'newitems':
        return <NewItemsView data={data} />;
      case 'monthcmp':
        return <ComparisonView title="Сравнение · месяц" rows={data.monthcmp} />;
      case 'weekcmp':
        return <ComparisonView title="Сравнение · неделя" rows={data.weekcmp} />;
      case 'deficit':
        return <DeficitView data={data} />;
      case 'procurement':
        return <ProcurementView data={data} />;
      case 'categories':
        return <CategoryTableView title="Категории" rows={data.categories} emptyMessage="Нет данных по категориям." />;
      case 'subcategories':
        return <CategoryTableView title="Подкатегории" rows={data.subcategories} emptyMessage="Нет данных по подкатегориям." />;
      case 'models':
        return <ModelsView data={data} />;
      case 'clients':
        return <ClientsView data={data} />;
      case 'dataquality':
        return <DataQualityView data={data} />;
      case 'tasks':
        return <TasksView data={data} />;
      case 'narrative':
        return <NarrativeView data={data} />;
      default:
        return null;
    }
  }

  return (
    <TooltipProvider>
      <header
        className={`sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b bg-background/95 backdrop-blur px-4 py-3 transition-[padding] sm:px-6 ${
          compact ? 'py-2' : 'py-4'
        }`}
      >
        <div className={`font-bold transition-[font-size] ${compact ? 'text-base' : 'text-xl'}`}>Decision Cockpit</div>

        {data && !unrecognizedMarkdown && (
          <nav className="flex gap-1 overflow-x-auto md:flex-1 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:border-t max-md:bg-background max-md:px-2 max-md:py-1.5 max-md:shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
            <button
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => setActiveTab('upload')}
            >
              Загрузка
            </button>
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                  activeTab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 max-w-[40%] truncate text-sm text-muted-foreground">
          <span className="truncate">{reportTitle}</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-6">{renderActive()}</main>
    </TooltipProvider>
  );
}
