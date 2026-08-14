// Парсер MD-контракта дашборда решений по товарным запасам.
// Смотри раздел 1 техспеки: секции помечены якорями <!-- id:start --> ... <!-- id:end -->,
// внутри секции — первая markdown-таблица (кроме narrative, там свободный текст).

const REQUIRED_SECTIONS = ['meta', 'kpi', 'statuses'];

// Ключевые слова для fallback-поиска секции по заголовку ##, если якоря отсутствуют.
const SECTION_HEADING_KEYWORDS = {
  meta: ['мета', 'meta'],
  kpi: ['kpi', 'показател'],
  statuses: ['карта капитала', 'статус'],
  categories: ['категор'],
  subcategories: ['подкатегор'],
  models: ['модел'],
  deficit: ['дефицит'],
  actions7d: ['7 дн', 'действи'],
  narrative: ['повествован', 'методик'],
};

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

function coerce(value) {
  const trimmed = value.trim();
  if (NUMBER_RE.test(trimmed)) return parseFloat(trimmed);
  return trimmed;
}

function splitTableRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  return row.split('|').map((cell) => cell.trim());
}

function isSeparatorRow(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

// Находит первую markdown-таблицу в блоке текста и возвращает массив объектов-строк.
function extractFirstTable(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (!line.includes('|')) continue;
    if (!isSeparatorRow(lines[i + 1])) continue;

    const headers = splitTableRow(line);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
      const cells = splitTableRow(lines[j]);
      const row = {};
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

function findByAnchor(md, id) {
  const re = new RegExp(`<!--\\s*${id}:start\\s*-->([\\s\\S]*?)<!--\\s*${id}:end\\s*-->`, 'i');
  const match = md.match(re);
  return match ? match[1] : null;
}

function findByHeadingFallback(md, id) {
  const keywords = SECTION_HEADING_KEYWORDS[id] || [];
  if (keywords.length === 0) return null;

  const headingRe = /^##\s+(.+)$/gm;
  const headings = [];
  let m;
  while ((m = headingRe.exec(md)) !== null) {
    headings.push({ index: m.index, end: m.index + m[0].length, title: m[1].trim() });
  }

  for (const heading of headings) {
    const titleLower = heading.title.toLowerCase();
    if (keywords.some((kw) => titleLower.includes(kw))) {
      const nextIndex = headings.find((h) => h.index > heading.index)?.index ?? md.length;
      return md.slice(heading.end, nextIndex);
    }
  }
  return null;
}

function extractSection(md, id) {
  const anchored = findByAnchor(md, id);
  if (anchored !== null) return { text: anchored, source: 'anchor' };

  const fallback = findByHeadingFallback(md, id);
  if (fallback !== null) return { text: fallback, source: 'heading' };

  return null;
}

// meta — единственная секция "ключ/значение", превращается в плоский объект.
function parseMetaTable(rows) {
  const meta = {};
  for (const row of rows) {
    const values = Object.values(row);
    const key = values[0];
    const value = values[1];
    if (key === undefined) continue;
    meta[String(key)] = value;
  }
  return meta;
}

const TABLE_SECTIONS = ['kpi', 'statuses', 'categories', 'subcategories', 'models', 'deficit', 'actions7d'];

export function parseReport(md) {
  const warnings = [];
  const result = {
    meta: {},
    kpi: [],
    statuses: [],
    categories: [],
    subcategories: [],
    models: [],
    deficit: [],
    actions7d: [],
    narrative: '',
    warnings,
    missingSections: [],
  };

  let anySectionFound = false;

  // meta
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
      result.missingSections.push('meta');
    }
  } else {
    result.missingSections.push('meta');
  }

  // table-based sections
  for (const id of TABLE_SECTIONS) {
    const section = extractSection(md, id);
    if (!section) {
      result.missingSections.push(id);
      continue;
    }
    anySectionFound = true;
    const table = extractFirstTable(section.text);
    if (!table) {
      warnings.push(`Секция "${id}" найдена, но таблица внутри не распознана.`);
      result.missingSections.push(id);
      continue;
    }
    result[id] = table.rows;
    if (section.source === 'heading') {
      warnings.push(`Секция "${id}" найдена по заголовку (fallback), а не по якорю — проверьте разметку.`);
    }
  }

  // narrative — свободный текст, без табличного парсинга
  const narrativeSection = extractSection(md, 'narrative');
  if (narrativeSection) {
    anySectionFound = true;
    result.narrative = narrativeSection.text.trim();
  } else {
    result.missingSections.push('narrative');
  }

  for (const id of REQUIRED_SECTIONS) {
    if (result.missingSections.includes(id)) {
      warnings.push(`Обязательная секция "${id}" не найдена.`);
    }
  }

  result.recognized = anySectionFound;
  return result;
}

export { REQUIRED_SECTIONS };
