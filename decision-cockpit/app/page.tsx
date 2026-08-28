'use client';

import * as React from 'react';
import { marked } from 'marked';

import { ThemeToggle } from '@/components/theme-toggle';
import { AppSidebar } from '@/components/app-sidebar';
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
  const [activeTab, setActiveTab] = React.useState<TabId | 'upload'>('upload');
  const [unrecognizedMarkdown, setUnrecognizedMarkdown] = React.useState<string | null>(null);

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

  const tabs = data && !unrecognizedMarkdown ? visibleTabs(data) : [];
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
        return <ComparisonView title="Сравнение · неделя" rows={data.weekcmp} transpose />;
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
      <div className="flex min-h-screen w-full">
        <AppSidebar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
            <span className="max-w-[60%] truncate text-sm text-muted-foreground">{reportTitle}</span>
            <ThemeToggle />
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{renderActive()}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
