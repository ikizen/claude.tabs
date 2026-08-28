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
  group?: string;
};

export const TAB_DEFS: TabDef[] = [
  { id: 'overview', label: 'Обзор', always: true },
  { id: 'actions7d', label: 'Действия', always: true },
  { id: 'weekly', label: 'Недели', dataKey: 'weekly', group: 'Аналитика' },
  { id: 'forecast', label: 'Прогноз', dataKey: 'forecast', group: 'Аналитика' },
  { id: 'newitems', label: 'Новинки', dataKey: 'newitems', group: 'Аналитика' },
  { id: 'monthcmp', label: 'Сравнение · месяц', dataKey: 'monthcmp', group: 'Аналитика' },
  { id: 'weekcmp', label: 'Сравнение · неделя', dataKey: 'weekcmp', group: 'Аналитика' },
  { id: 'deficit', label: 'Дефицит', always: true, group: 'Запасы' },
  { id: 'procurement', label: 'Закуп', dataKey: 'procurement', group: 'Запасы' },
  { id: 'categories', label: 'Категории', always: true, group: 'Запасы' },
  { id: 'subcategories', label: 'Подкатегории', always: true, group: 'Запасы' },
  { id: 'models', label: 'Модели', always: true, group: 'Запасы' },
  { id: 'clients', label: 'Клиенты', dataKey: 'clients', group: 'Клиенты и данные' },
  { id: 'dataquality', label: 'Качество данных', dataKey: 'dataquality', group: 'Клиенты и данные' },
  { id: 'tasks', label: 'Задачи', dataKey: 'tasks' },
  { id: 'narrative', label: 'Методика', always: true },
];

export function visibleTabs(data: ParsedReport | null): TabDef[] {
  return TAB_DEFS.filter((def) => def.always || (data && def.dataKey && (data[def.dataKey] as unknown[]).length > 0));
}
