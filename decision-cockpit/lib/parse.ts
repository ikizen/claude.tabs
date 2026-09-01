// Парсер MD-контракта дашборда решений по товарным запасам.
// Секции помечены якорями <!-- id:start --> ... <!-- id:end -->, внутри
// секции — первая markdown-таблица (кроме narrative, там свободный текст).

export type ReportRow = Record<string, string | number>;

export interface ParsedReport {
  meta: Record<string, string | number>;
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

const TABLE_SECTIONS = [
  'kpi',
  'statuses',
  'categories',
  'subcategories',
  'models',
  'deficit',
  'actions7d',
  'forecast',
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

  result.recognized = anySectionFound;
  return result;
}

export { REQUIRED_SECTIONS };
