import type { ParsedReport } from '@/lib/parse';

export type TabId =
  | 'upload'
  | 'overview'
  | 'actions7d'
  | 'weekly'
  | 'forecast'
  | 'newitems'
  | 'monthcmp'
  | 'weekcmp'
  | 'deficit'
  | 'procurement'
  | 'categories'
  | 'subcategories'
  | 'models'
  | 'clients'
  | 'dataquality'
  | 'tasks'
  | 'narrative';

export type TabDef = {
  id: TabId;
  label: string;
  always?: boolean;
  dataKey?: keyof ParsedReport;
};

export const TAB_DEFS: TabDef[] = [
  { id: 'overview', label: 'Обзор', always: true },
  { id: 'actions7d', label: 'Действия', always: true },
  { id: 'weekly', label: 'Недели', dataKey: 'weekly' },
  { id: 'forecast', label: 'Прогноз', dataKey: 'forecast' },
  { id: 'newitems', label: 'Новинки', dataKey: 'newitems' },
  { id: 'monthcmp', label: 'Сравнение · месяц', dataKey: 'monthcmp' },
  { id: 'weekcmp', label: 'Сравнение · неделя', dataKey: 'weekcmp' },
  { id: 'deficit', label: 'Дефицит', always: true },
  { id: 'procurement', label: 'Закуп', dataKey: 'procurement' },
  { id: 'categories', label: 'Категории', always: true },
  { id: 'subcategories', label: 'Подкатегории', always: true },
  { id: 'models', label: 'Модели', always: true },
  { id: 'clients', label: 'Клиенты', dataKey: 'clients' },
  { id: 'dataquality', label: 'Качество данных', dataKey: 'dataquality' },
  { id: 'tasks', label: 'Задачи', dataKey: 'tasks' },
  { id: 'narrative', label: 'Методика', always: true },
];

export function visibleTabs(data: ParsedReport | null): TabDef[] {
  return TAB_DEFS.filter((def) => def.always || (data && def.dataKey && (data[def.dataKey] as unknown[]).length > 0));
}
