// Парсер MD-контракта дашборда решений по товарным запасам.
// Секции помечены якорями <!-- id:start --> ... <!-- id:end -->. Внутри
// секции — либо первая markdown-таблица, либо (начиная со schema_version 3.0,
// для секций productTree/forecast) JSON, огороженный ```json ... ```.
// Тип секции определяется по первому непустому символу содержимого.

export type ReportRow = Record<string, string | number>;

export type PositionFlags = {
  dataQuality: string;
  history: string;
  economics: string;
  confidence: string;
};

export interface ProductTreeModel {
  name: string;
  stockQty: number;
  stockValue: number;
  unitCost: number;
  costSource: string;
  sold12: number;
  revenue12: number;
  gp12: number;
  margin: number;
  coverage: number;
  coverageBasis: string;
  flags: PositionFlags;
  headline: string;
  action: string;
  reasonCodes: string[];
}

export interface ProductTreeSubcategory {
  key: string;
  stock: number;
  sku: number;
  revenue12: number;
  gp12: number;
  margin: number;
  models: ProductTreeModel[];
}

export interface ProductTreeCategory {
  key: string;
  stock: number;
  sku: number;
  revenue12: number;
  gp12: number;
  margin: number;
  subcategories: ProductTreeSubcategory[];
}

export interface ForecastScenario {
  m1: number;
  m3: number;
  m6: number;
  m9: number;
  m12: number;
  m12Money: number;
  price: number;
  margin: number;
}

export interface ForecastObjectV3 {
  name: string;
  level: 'категория' | 'подкатегория' | 'модель';
  category?: string;
  seasonWindowMonths: number[];
  baseMonthlyQty: number;
  trendRaw: number;
  trendAdjusted: number;
  trendClipped: boolean;
  accuracy: string;
  scenarios: Record<string, ForecastScenario>;
}

export interface ForecastV3 {
  horizonMonths: number[];
  scenarioNames: string[];
  objects: ForecastObjectV3[];
}

export interface ParsedReport {
  meta: Record<string, string | number>;
  schemaVersion: number;
  categoryKeysMeta: string[];
  productTree: ProductTreeCategory[] | null;
  forecastV3: ForecastV3 | null;
  kpi: ReportRow[];
  statuses: ReportRow[];
  categories: ReportRow[];
  subcategories: ReportRow[];
  models: ReportRow[];
  deficit: ReportRow[];
  actions7d: ReportRow[];
  forecast: ReportRow[];
  newitems: ReportRow[];
  clients: ReportRow[];
  retention: ReportRow[];
  dataquality: ReportRow[];
  weekly: ReportRow[];
  monthcmp: ReportRow[];
  weekcmp: ReportRow[];
  procurement: ReportRow[];
  tasks: ReportRow[];
  abcproducts: ReportRow[];
  narrative: string;
  warnings: string[];
  missingSections: string[];
  recognized: boolean;
}

const REQUIRED_SECTIONS = ['meta', 'kpi', 'statuses'];

type Keyword = string | string[];

const SECTION_HEADING_KEYWORDS: Record<string, Keyword[]> = {
  meta: ['мета', 'meta'],
  kpi: ['kpi', 'показател'],
  statuses: ['карта капитала', 'статус'],
  productTree: [['дерево', 'товар']],
  categories: ['категор'],
  subcategories: ['подкатегор'],
  models: ['модел'],
  deficit: ['дефицит'],
  actions7d: ['7 дн', 'действи'],
  forecast: ['прогноз'],
  newitems: ['новинк'],
  clients: ['клиенты'],
  retention: ['удержание', 'отток'],
  dataquality: ['качество данных'],
  weekly: ['недельн'],
  monthcmp: [['сравнение', 'месяц']],
  weekcmp: [['сравнение', 'недел']],
  procurement: ['закуп'],
  tasks: ['задач', 'канбан'],
  abcproducts: [['abc', 'товар']],
  narrative: ['повествован', 'методик'],
};

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

function coerce(value: string): string | number {
  const trimmed = value.trim();
  if (NUMBER_RE.test(trimmed)) return parseFloat(trimmed);
  return trimmed;
}

function splitTableRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  return row.split('|').map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function extractFirstTable(text: string): { headers: string[]; rows: ReportRow[] } | null {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (!line.includes('|')) continue;
    if (!isSeparatorRow(lines[i + 1])) continue;

    const headers = splitTableRow(line);
    const rows: ReportRow[] = [];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
      const cells = splitTableRow(lines[j]);
      const row: ReportRow = {};
      headers.forEach((header, idx) => {
        row[header] = coerce(cells[idx] ?? '');
      });
      rows.push(row);
      j++;
    }
    return { headers, rows };
  }
  return null;
}

// Первый непустой (и не-заголовочный) символ содержимого секции решает,
// парсить её как JSON-блок или как markdown-таблицу.
function detectSectionKind(text: string): 'json' | 'table' {
  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('```') || line.startsWith('{') || line.startsWith('[')) return 'json';
    return 'table';
  }
  return 'table';
}

function parseJsonBlock<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function findByAnchor(md: string, id: string): string | null {
  const re = new RegExp(`<!--\\s*${id}:start\\s*-->([\\s\\S]*?)<!--\\s*${id}:end\\s*-->`, 'i');
  const match = md.match(re);
  return match ? match[1] : null;
}

function findByHeadingFallback(md: string, id: string): string | null {
  const keywords = SECTION_HEADING_KEYWORDS[id] || [];
  if (keywords.length === 0) return null;

  const headingRe = /^##\s+(.+)$/gm;
  const headings: { index: number; end: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(md)) !== null) {
    headings.push({ index: m.index, end: m.index + m[0].length, title: m[1].trim() });
  }

  for (const heading of headings) {
    const titleLower = heading.title.toLowerCase();
    const matches = keywords.some((kw) =>
      Array.isArray(kw) ? kw.every((part) => titleLower.includes(part)) : titleLower.includes(kw)
    );
    if (matches) {
      const nextIndex = headings.find((h) => h.index > heading.index)?.index ?? md.length;
      return md.slice(heading.end, nextIndex);
    }
  }
  return null;
}

function extractSection(md: string, id: string): { text: string; source: 'anchor' | 'heading' } | null {
  const anchored = findByAnchor(md, id);
  if (anchored !== null) return { text: anchored, source: 'anchor' };

  const fallback = findByHeadingFallback(md, id);
  if (fallback !== null) return { text: fallback, source: 'heading' };

  return null;
}

function parseMetaTable(rows: ReportRow[]): Record<string, string | number> {
  const meta: Record<string, string | number> = {};
  for (const row of rows) {
    const values = Object.values(row);
    const key = values[0];
    const value = values[1];
    if (key === undefined) continue;
    meta[String(key)] = value;
  }
  return meta;
}

// productTree — дерево категория→подкатегория→модель из JSON — распрямляется
// в те же табличные формы (categories/subcategories/models), которыми уже
// пользуются существующие вкладки. Так старые компоненты работают без
// переделки, а новый экран моделей отдельно читает флаги/headline/reasonCodes.
function flattenProductTree(tree: ProductTreeCategory[]): {
  categories: ReportRow[];
  subcategories: ReportRow[];
  models: ReportRow[];
} {
  const categories: ReportRow[] = [];
  const subcategories: ReportRow[] = [];
  const models: ReportRow[] = [];

  for (const cat of tree) {
    categories.push({
      'Категория': cat.key,
      'Остаток': cat.stock,
      SKU: cat.sku,
      'Выручка12': cat.revenue12,
      'ВП12': cat.gp12,
      'Маржа': cat.margin,
    });

    for (const sub of cat.subcategories ?? []) {
      subcategories.push({
        'Категория': sub.key,
        'Остаток': sub.stock,
        SKU: sub.sku,
        'Выручка12': sub.revenue12,
        'ВП12': sub.gp12,
        'Маржа': sub.margin,
      });

      for (const model of sub.models ?? []) {
        models.push({
          'Модель': model.name,
          'Категория': cat.key,
          'Подкатегория': sub.key,
          'Остаток_шт': model.stockQty,
          'Остаток_тг': model.stockValue,
          'Себест_ед': model.unitCost,
          'Источник_себест': model.costSource,
          'Продано12': model.sold12,
          'Выручка12': model.revenue12,
          'ВП12': model.gp12,
          'Маржа': model.margin,
          'Покрытие_сезонов': model.coverage,
          'БазаПокрытия': model.coverageBasis,
          'Действие': model.action,
          headline: model.headline,
          flags_dataQuality: model.flags?.dataQuality ?? '',
          flags_history: model.flags?.history ?? '',
          flags_economics: model.flags?.economics ?? '',
          flags_confidence: model.flags?.confidence ?? '',
          reasonCodes: (model.reasonCodes ?? []).join('; '),
        });
      }
    }
  }

  return { categories, subcategories, models };
}

// Один forecast-объект со сценариями внутри распрямляется в старую построчную
// форму (одна строка = один выбранный сценарий) — так дерево прогноза и
// расчёт итогов (Правило 2) продолжают работать без переписывания.
export function flattenForecastV3(fc: ForecastV3, scenario: string): ReportRow[] {
  return fc.objects.map((obj) => {
    const s = obj.scenarios[scenario] ?? obj.scenarios[fc.scenarioNames[0]];
    return {
      'Объект': obj.name,
      'Уровень': obj.level,
      'Категория': obj.category ?? '',
      'Сезон_окно': (obj.seasonWindowMonths ?? []).join('-'),
      'База_мес_шт': obj.baseMonthlyQty,
      'Тренд': obj.trendAdjusted,
      'ТрендОграничен': obj.trendClipped ? 1 : 0,
      'Прогноз_1м': s?.m1 ?? 0,
      'Прогноз_3м': s?.m3 ?? 0,
      'Прогноз_6м': s?.m6 ?? 0,
      'Прогноз_9м': s?.m9 ?? 0,
      'Прогноз_12м': s?.m12 ?? 0,
      'Прогноз_12м_тг': s?.m12Money ?? 0,
      'Точность': obj.accuracy,
    };
  });
}

export function defaultScenario(fc: ForecastV3): string {
  return fc.scenarioNames.includes('базовый') ? 'базовый' : fc.scenarioNames[Math.floor(fc.scenarioNames.length / 2)] ?? fc.scenarioNames[0];
}

// Сверка справочника ключей категорий (meta.categoryKeys) с деревом товаров и
// с колонкой "Категория" плоских секций — не блокирует загрузку, только
// предупреждает о возможном рассинхроне названий.
function validateCategoryKeys(result: ParsedReport, warnings: string[]) {
  const keys = result.categoryKeysMeta;
  if (keys.length === 0) return;
  const keySet = new Set(keys);

  if (result.productTree) {
    const treeKeys = new Set(result.productTree.map((c) => c.key));
    keys.forEach((k) => {
      if (!treeKeys.has(k)) {
        warnings.push(`В отчёте упомянута категория, которой нет в дереве товаров: ${k}`);
      }
    });
  }

  const sectionsToCheck: { id: 'procurement' | 'weekly'; label: string }[] = [
    { id: 'procurement', label: 'Закуп' },
    { id: 'weekly', label: 'Недельная динамика' },
  ];
  const seen = new Set<string>();
  sectionsToCheck.forEach(({ id, label }) => {
    result[id].forEach((row) => {
      const v = row['Категория'];
      if (!v || v === 'ALL') return;
      const s = String(v);
      const dedupeKey = `${id}:${s}`;
      if (!keySet.has(s) && !seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        warnings.push(`Категория "${s}" в разделе «${label}» не найдена в справочнике categoryKeys.`);
      }
    });
  });
}

const TABLE_SECTIONS = [
  'kpi',
  'statuses',
  'categories',
  'subcategories',
  'models',
  'deficit',
  'actions7d',
  'newitems',
  'clients',
  'retention',
  'dataquality',
  'weekly',
  'monthcmp',
  'weekcmp',
  'procurement',
  'tasks',
  'abcproducts',
] as const;

export function parseReport(md: string): ParsedReport {
  const warnings: string[] = [];
  const missingSections: string[] = [];
  const result: ParsedReport = {
    meta: {},
    schemaVersion: 1.0,
    categoryKeysMeta: [],
    productTree: null,
    forecastV3: null,
    kpi: [],
    statuses: [],
    categories: [],
    subcategories: [],
    models: [],
    deficit: [],
    actions7d: [],
    forecast: [],
    newitems: [],
    clients: [],
    retention: [],
    dataquality: [],
    weekly: [],
    monthcmp: [],
    weekcmp: [],
    procurement: [],
    tasks: [],
    abcproducts: [],
    narrative: '',
    warnings,
    missingSections,
    recognized: false,
  };

  let anySectionFound = false;

  const metaSection = extractSection(md, 'meta');
  if (metaSection) {
    anySectionFound = true;
    const table = extractFirstTable(metaSection.text);
    if (table) {
      result.meta = parseMetaTable(table.rows);
      if (metaSection.source === 'heading') {
        warnings.push('Секция "meta" найдена по заголовку (fallback), а не по якорю — проверьте разметку.');
      }
    } else {
      warnings.push('Секция "meta" найдена, но таблица внутри не распознана.');
      missingSections.push('meta');
    }
  } else {
    missingSections.push('meta');
  }

  // schema_version отсутствует → считаем 1.0 и не пытаемся парсить JSON-секции,
  // даже если они физически есть в файле (полная обратная совместимость).
  const rawVersion = result.meta['schema_version'];
  result.schemaVersion = rawVersion !== undefined ? parseFloat(String(rawVersion)) || 1.0 : 1.0;
  const rawCategoryKeys = result.meta['categoryKeys'];
  result.categoryKeysMeta = rawCategoryKeys
    ? String(rawCategoryKeys)
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  for (const id of TABLE_SECTIONS) {
    const section = extractSection(md, id);
    if (!section) {
      missingSections.push(id);
      continue;
    }
    anySectionFound = true;
    const table = extractFirstTable(section.text);
    if (!table) {
      warnings.push(`Секция "${id}" найдена, но таблица внутри не распознана.`);
      missingSections.push(id);
      continue;
    }
    (result[id] as ReportRow[]) = table.rows;
    if (section.source === 'heading') {
      warnings.push(`Секция "${id}" найдена по заголовку (fallback), а не по якорю — проверьте разметку.`);
    }
  }

  // productTree — JSON-дерево категорий, заменяет собой связку
  // categories/subcategories/models из v2. Если найден и валиден — берёт
  // приоритет над табличными секциями (которые новые отчёты уже не пишут).
  const productTreeSection = extractSection(md, 'productTree');
  if (productTreeSection) {
    if (result.schemaVersion >= 3) {
      anySectionFound = true;
      const kind = detectSectionKind(productTreeSection.text);
      if (kind === 'json') {
        const parsed = parseJsonBlock<{ categories: ProductTreeCategory[] }>(productTreeSection.text);
        if (parsed && Array.isArray(parsed.categories)) {
          result.productTree = parsed.categories;
          const flat = flattenProductTree(parsed.categories);
          result.categories = flat.categories;
          result.subcategories = flat.subcategories;
          result.models = flat.models;
        } else {
          warnings.push('Секция "productTree" найдена, но JSON внутри не распознан.');
        }
      } else {
        warnings.push('Секция "productTree" найдена, но не похожа на JSON-блок.');
      }
    }
    // schema_version < 3 → секция сознательно игнорируется, дерево не парсится.
  }

  // forecast — при schema_version >= 3 может быть JSON-объектом со
  // вложенными сценариями вместо построчной markdown-таблицы.
  const forecastSection = extractSection(md, 'forecast');
  if (forecastSection) {
    anySectionFound = true;
    const kind = detectSectionKind(forecastSection.text);
    if (kind === 'json' && result.schemaVersion >= 3) {
      const parsed = parseJsonBlock<ForecastV3>(forecastSection.text);
      if (parsed && Array.isArray(parsed.objects)) {
        result.forecastV3 = parsed;
        result.forecast = flattenForecastV3(parsed, defaultScenario(parsed));
      } else {
        warnings.push('Секция "forecast" найдена, но JSON внутри не распознан.');
        missingSections.push('forecast');
      }
    } else if (kind === 'table') {
      const table = extractFirstTable(forecastSection.text);
      if (table) {
        result.forecast = table.rows;
      } else {
        warnings.push('Секция "forecast" найдена, но таблица внутри не распознана.');
        missingSections.push('forecast');
      }
    } else {
      // JSON-блок при schema_version < 3 — по контракту не парсится.
      missingSections.push('forecast');
    }
    if (forecastSection.source === 'heading') {
      warnings.push('Секция "forecast" найдена по заголовку (fallback), а не по якорю — проверьте разметку.');
    }
  } else {
    missingSections.push('forecast');
  }

  const narrativeSection = extractSection(md, 'narrative');
  if (narrativeSection) {
    anySectionFound = true;
    result.narrative = narrativeSection.text.trim();
  } else {
    missingSections.push('narrative');
  }

  for (const id of REQUIRED_SECTIONS) {
    if (missingSections.includes(id)) {
      warnings.push(`Обязательная секция "${id}" не найдена.`);
    }
  }

  validateCategoryKeys(result, warnings);

  result.recognized = anySectionFound;
  return result;
}

export { REQUIRED_SECTIONS };
