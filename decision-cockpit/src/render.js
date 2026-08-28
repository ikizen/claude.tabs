import { marked } from 'marked';

const STATUS_CLASS = {
  'BUY MORE': 'status-buymore',
  PUSH: 'status-push',
  HOLD: 'status-hold',
  'STOP BUY': 'status-stopbuy',
  BUNDLE: 'status-bundle',
  DISCOUNT: 'status-discount',
  LIQUIDATE: 'status-liquidate',
};

const EFFORT_CLASS = {
  'низкие': 'effort-low',
  'средние': 'effort-mid',
  'высокие': 'effort-high',
};

const EVAL_CLASS = {
  good: 'eval-good',
  bad: 'eval-bad',
  neutral: 'eval-neutral',
};

const ACCURACY_CLASS = { 'высокая': 'accuracy-high', 'средняя': 'accuracy-mid', 'низкая': 'accuracy-low' };
const RISK_CLASS = { 'низкий': 'risk-low', 'средний': 'risk-mid', 'высокий': 'risk-high' };
const CLIENT_STATUS_CLASS = {
  'растёт': 'client-up',
  'стабилен': 'client-stable',
  'падает': 'client-down',
  'новый': 'client-new',
  'ушёл': 'client-churned',
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(child);
  }
  return node;
}

function statusBadge(status) {
  const cls = STATUS_CLASS[status] || 'status-default';
  return el('span', { class: `badge ${cls}`, text: status });
}

function effortBadge(effort) {
  const cls = EFFORT_CLASS[String(effort).toLowerCase()] || 'effort-mid';
  return el('span', { class: `badge ${cls}`, text: effort });
}

function fmtNumber(value) {
  if (typeof value !== 'number') return value ?? '';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}

function fmtMoney(value) {
  if (typeof value !== 'number') return value ?? '';
  return `${fmtNumber(value)} ₸`;
}

function fmtPercent(value) {
  if (typeof value !== 'number') return value ?? '';
  return `${(value * 100).toFixed(1)}%`;
}

function emptyState(message) {
  return el('div', { class: 'empty-state', text: message });
}

function kpiTile(label, value, caption) {
  const card = el('div', { class: 'kpi-card eval-neutral' });
  card.appendChild(el('div', { class: 'kpi-label', text: label }));
  card.appendChild(el('div', { class: 'kpi-value', text: value }));
  if (caption) card.appendChild(el('div', { class: 'kpi-caption', text: caption }));
  return card;
}

// ---- Обзор ----

function kpiCard(row) {
  const evalKey = String(row['Оценка'] || 'neutral').toLowerCase();
  const cls = EVAL_CLASS[evalKey] || 'eval-neutral';
  const card = el('div', { class: `kpi-card ${cls}` });
  card.appendChild(el('div', { class: 'kpi-label', text: row['Показатель'] ?? '' }));
  card.appendChild(el('div', { class: 'kpi-value', text: fmtNumber(row['Значение']) }));
  if (row['Подпись']) card.appendChild(el('div', { class: 'kpi-caption', text: row['Подпись'] }));
  return card;
}

function statusColorClass(status) {
  return STATUS_CLASS[status] || 'status-default';
}

function renderCapitalBar(container, statuses) {
  const total = statuses.reduce((sum, s) => sum + (Number(s['Остаток']) || 0), 0);
  const bar = el('div', { class: 'capital-bar' });
  for (const s of statuses) {
    const amount = Number(s['Остаток']) || 0;
    const pct = total > 0 ? (amount / total) * 100 : 0;
    const segment = el('div', {
      class: `capital-segment ${statusColorClass(s['Статус'])}`,
      style: `width:${pct}%`,
      title: `${s['Статус']}: ${fmtMoney(amount)} (${pct.toFixed(1)}%)`,
    });
    bar.appendChild(segment);
  }
  container.appendChild(bar);
}

function renderStatusTable(container, statuses) {
  const total = statuses.reduce((sum, s) => sum + (Number(s['Остаток']) || 0), 0);
  const table = el('table', { class: 'data-table' });
  const thead = el('thead', {}, el('tr', {}, [
    el('th', { text: 'Статус' }),
    el('th', { text: 'Моделей' }),
    el('th', { text: 'Остаток' }),
    el('th', { text: '%' }),
    el('th', { text: 'Излишек' }),
    el('th', { text: 'Возврат консерв.' }),
    el('th', { text: 'Возврат базовый' }),
    el('th', { text: 'Возврат агрессив.' }),
  ]));
  const tbody = el('tbody');
  for (const s of statuses) {
    const amount = Number(s['Остаток']) || 0;
    const pct = total > 0 ? (amount / total) * 100 : 0;
    const tr = el('tr', {}, [
      el('td', { 'data-label': 'Статус' }, statusBadge(s['Статус'])),
      el('td', { 'data-label': 'Моделей', text: fmtNumber(s['Моделей']) }),
      el('td', { 'data-label': 'Остаток', text: fmtMoney(s['Остаток']) }),
      el('td', { 'data-label': '%', text: `${pct.toFixed(1)}%` }),
      el('td', { 'data-label': 'Излишек', text: fmtMoney(s['Излишек']) }),
      el('td', { 'data-label': 'Возврат консерв.', text: fmtMoney(s['Возврат_консерв'] ?? s['Возврат_база']) }),
      el('td', { 'data-label': 'Возврат базовый', text: fmtMoney(s['Возврат_базовый'] ?? s['Возврат_база']) }),
      el('td', { 'data-label': 'Возврат агрессив.', text: fmtMoney(s['Возврат_агрессив']) }),
    ]);
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  const wrap = el('div', { class: 'table-scroll' }, table);
  container.appendChild(wrap);
}

export function renderOverview(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Обзор' }));

  if (data.kpi.length === 0) {
    view.appendChild(emptyState('Нет данных KPI.'));
  } else {
    const grid = el('div', { class: 'kpi-grid' });
    data.kpi.forEach((row) => grid.appendChild(kpiCard(row)));
    view.appendChild(grid);
  }

  view.appendChild(el('h3', { text: 'Карта капитала по статусам' }));
  if (data.statuses.length === 0) {
    view.appendChild(emptyState('Нет данных по статусам.'));
  } else {
    renderCapitalBar(view, data.statuses);
    renderStatusTable(view, data.statuses);
  }

  container.appendChild(view);
}

// ---- Действия на 7 дней ----

export function renderActions7d(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Действия на 7 дней' }));

  if (data.actions7d.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const sorted = [...data.actions7d].sort(
    (a, b) => (Number(b['Эффект_тг']) || 0) - (Number(a['Эффект_тг']) || 0)
  );

  const list = el('div', { class: 'action-list' });
  sorted.forEach((row) => {
    const card = el('div', { class: 'action-card' });
    card.appendChild(el('div', { class: 'action-priority', text: `#${row['Приоритет'] ?? ''}` }));
    const main = el('div', { class: 'action-main' });
    main.appendChild(el('div', { class: 'action-title', text: row['Действие'] ?? '' }));
    const meta = el('div', { class: 'action-meta' });
    if (row['Группа']) meta.appendChild(el('span', { class: 'action-group', text: row['Группа'] }));
    if (row['Кто']) meta.appendChild(el('span', { class: 'action-who', text: row['Кто'] }));
    main.appendChild(meta);
    card.appendChild(main);
    card.appendChild(el('div', { class: 'action-effect', text: fmtMoney(row['Эффект_тг']) }));
    card.appendChild(effortBadge(row['Усилия'] ?? ''));
    list.appendChild(card);
  });
  view.appendChild(list);
  container.appendChild(view);
}

// ---- Дефицит ----

export function renderDeficit(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Дефицит под сезон' }));

  if (data.deficit.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const totalOrderCost = data.deficit.reduce((sum, r) => sum + (Number(r['Себест_заказа']) || 0), 0);
  view.appendChild(
    el('div', { class: 'kpi-card eval-neutral standalone' }, [
      el('div', { class: 'kpi-label', text: 'Себестоимость заказа (сумма)' }),
      el('div', { class: 'kpi-value', text: fmtMoney(totalOrderCost) }),
    ])
  );

  const sorted = [...data.deficit].sort(
    (a, b) => (Number(a['ХватитДней']) || 0) - (Number(b['ХватитДней']) || 0)
  );

  const columns = Object.keys(data.deficit[0]);
  const table = buildSortableTable(columns, sorted, {
    renderCell: (col, value) => {
      if (col === 'ХватитДней') {
        const days = Number(value) || 0;
        const cell = el('td', { text: fmtNumber(value) });
        if (days < 10) cell.appendChild(el('span', { class: 'badge status-urgent inline', text: 'СРОЧНО' }));
        return cell;
      }
      if (col === 'Приоритет') return el('td', { text: value });
      if (['ВП12', 'Себест_заказа'].includes(col)) return el('td', { text: fmtMoney(value) });
      if (col === 'Маржа') return el('td', { text: fmtPercent(value) });
      return el('td', { text: typeof value === 'number' ? fmtNumber(value) : value });
    },
  });
  view.appendChild(table);
  container.appendChild(view);
}

// ---- Generic sortable table ----

function buildSortableTable(columns, rows, opts = {}) {
  let sortCol = opts.defaultSortCol ?? null;
  let sortDir = 1;
  const wrap = el('div', { class: 'table-scroll' });
  const table = el('table', { class: 'data-table' });

  function draw() {
    table.innerHTML = '';
    let sorted = rows;
    if (sortCol) {
      sorted = [...rows].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
        return String(av ?? '').localeCompare(String(bv ?? '')) * sortDir;
      });
    }

    const thead = el('thead');
    const headRow = el('tr');
    columns.forEach((col) => {
      const th = el('th', { text: col, class: 'sortable' });
      if (col === sortCol) th.classList.add(sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
      th.addEventListener('click', () => {
        if (sortCol === col) sortDir *= -1;
        else {
          sortCol = col;
          sortDir = 1;
        }
        draw();
      });
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = el('tbody');
    sorted.forEach((row, idx) => {
      const tr = el('tr');
      if (idx < 20) {
        tr.classList.add('row-enter');
        tr.style.animationDelay = `${idx * 25}ms`;
      }
      columns.forEach((col) => {
        const td = opts.renderCell
          ? opts.renderCell(col, row[col], row)
          : el('td', { text: typeof row[col] === 'number' ? fmtNumber(row[col]) : row[col] ?? '' });
        if (!td.hasAttribute('data-label')) td.setAttribute('data-label', col);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
  }

  draw();
  wrap.appendChild(table);
  return wrap;
}

// ---- Категории / Подкатегории (одна и та же схема рендера) ----

export function renderCategoryLikeTable(container, rows, title, emptyMessage) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: title }));

  if (rows.length === 0) {
    view.appendChild(emptyState(emptyMessage));
    container.appendChild(view);
    return;
  }

  const searchWrap = el('div', { class: 'toolbar' });
  const search = el('input', { type: 'text', placeholder: 'Поиск по названию…', class: 'search-input' });
  searchWrap.appendChild(search);
  view.appendChild(searchWrap);

  const tableHost = el('div');
  view.appendChild(tableHost);

  const columns = Object.keys(rows[0]);
  const nameCol = columns[0];

  function draw() {
    const query = search.value.trim().toLowerCase();
    const filtered = query
      ? rows.filter((r) => String(r[nameCol] ?? '').toLowerCase().includes(query))
      : rows;
    tableHost.innerHTML = '';
    tableHost.appendChild(
      buildSortableTable(columns, filtered, {
        renderCell: (col, value) => {
          if (col === 'Статус') return el('td', {}, statusBadge(value));
          return el('td', { text: typeof value === 'number' ? fmtNumber(value) : value ?? '' });
        },
      })
    );
  }

  search.addEventListener('input', draw);
  draw();

  container.appendChild(view);
}

// ---- Модели ----
// Правило 1: если модель есть в newitems (сезон впереди), её реальный коммерческий
// статус (DISCOUNT/LIQUIDATE) никогда не показывается — она подменяется на NEW и
// пропадает из фильтра по этим статусам.

export function renderModels(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Модели' }));

  if (data.models.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const newItemNames = new Set(data.newitems.map((r) => r['Модель']));
  const rows = data.models.map((row) => {
    const isNewArrival = newItemNames.has(row['Модель']) && (row['Статус'] === 'DISCOUNT' || row['Статус'] === 'LIQUIDATE');
    return { ...row, __effectiveStatus: isNewArrival ? 'NEW' : row['Статус'], __isNewArrival: isNewArrival };
  });

  const columns = Object.keys(data.models[0]);
  const statuses = [...new Set(rows.map((r) => r.__effectiveStatus).filter(Boolean))];
  const categories = [...new Set(data.models.map((r) => r['Категория']).filter(Boolean))];

  const toolbar = el('div', { class: 'toolbar' });
  const search = el('input', { type: 'text', placeholder: 'Поиск по модели…', class: 'search-input' });
  const statusSelect = el('select', { class: 'filter-select' }, [
    el('option', { value: '', text: 'Все статусы' }),
    ...statuses.map((s) => el('option', { value: s, text: s })),
  ]);
  const categorySelect = el('select', { class: 'filter-select' }, [
    el('option', { value: '', text: 'Все категории' }),
    ...categories.map((c) => el('option', { value: c, text: c })),
  ]);
  toolbar.append(search, statusSelect, categorySelect);
  view.appendChild(toolbar);

  const tableHost = el('div');
  view.appendChild(tableHost);

  function draw() {
    const query = search.value.trim().toLowerCase();
    const statusFilter = statusSelect.value;
    const categoryFilter = categorySelect.value;
    const filtered = rows.filter((r) => {
      if (query && !String(r['Модель'] ?? '').toLowerCase().includes(query)) return false;
      if (statusFilter && r.__effectiveStatus !== statusFilter) return false;
      if (categoryFilter && r['Категория'] !== categoryFilter) return false;
      return true;
    });
    tableHost.innerHTML = '';
    tableHost.appendChild(
      buildSortableTable(columns, filtered, {
        renderCell: (col, value, row) => {
          if (col === 'Статус') {
            if (row.__isNewArrival) {
              const badge = el('span', { class: 'badge status-newarrival', text: 'NEW · сезон впереди' });
              badge.title = `Коммерческий статус в отчёте: ${row['Статус']}. Скрыт из списков на уценку/ликвидацию — см. вкладку «Новинки».`;
              return el('td', {}, badge);
            }
            return el('td', {}, statusBadge(value));
          }
          return el('td', { text: typeof value === 'number' ? fmtNumber(value) : value ?? '' });
        },
      })
    );
  }

  search.addEventListener('input', draw);
  statusSelect.addEventListener('change', draw);
  categorySelect.addEventListener('change', draw);
  draw();

  container.appendChild(view);
}

// ---- Прогноз ----
// Точность падает с уровнем детализации (7% / 32% / 100% медианной ошибки).
// Правило 2: итоговые карточки суммируют только строки уровня "категория".

let forecastHorizon = '12';

function numericPrefix(name) {
  const m = String(name ?? '').match(/^(\d+(?:\.\d+)?)\s*-/);
  return m ? m[1] : null;
}

function forecastValue(row, horizon) {
  return row[`Прогноз_${horizon}м`];
}

function accuracyIcon(accuracy) {
  if (accuracy === 'средняя') return '~';
  if (accuracy === 'низкая') return '⚠';
  return '';
}

function forecastNumberCell(row, horizon) {
  const accuracy = row['Точность'];
  const cls = ACCURACY_CLASS[accuracy] || '';
  const span = el('span', { class: `forecast-value ${cls}` });
  const icon = accuracyIcon(accuracy);
  if (icon) span.appendChild(el('span', { class: 'accuracy-icon', text: icon }));
  const value = forecastValue(row, horizon);
  span.appendChild(document.createTextNode(typeof value === 'number' ? `${fmtNumber(value)} шт` : '—'));
  if (accuracy === 'низкая') {
    span.title = 'Медианная ошибка прогноза по отдельной позиции — 100%, использовать только как ориентир.';
  } else if (accuracy === 'средняя') {
    span.title = 'Медианная ошибка прогноза на уровне подкатегории — 32%, доверять с оговорками.';
  }
  return span;
}

function trendPercentText(trend) {
  if (typeof trend !== 'number') return '—';
  const pct = (trend - 1) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
}

function trendBadge(trend) {
  if (typeof trend !== 'number') return el('span', { text: '—' });
  const pct = (trend - 1) * 100;
  const up = pct >= 0;
  return el('span', { class: `trend-badge ${up ? 'trend-up' : 'trend-down'}`, text: `${up ? '+' : ''}${pct.toFixed(0)}%` });
}

// Строит 12 месячных приращений линейной интерполяцией между известными
// контрольными точками (1/3/6/9/12 мес) — только для формы спарклайна,
// не для точных цифр.
function buildMonthlySeries(row) {
  const checkpoints = [0, 1, 3, 6, 9, 12];
  const cum = [0, row['Прогноз_1м'], row['Прогноз_3м'], row['Прогноз_6м'], row['Прогноз_9м'], row['Прогноз_12м']].map(
    (v) => Number(v) || 0
  );
  const months = [];
  for (let m = 1; m <= 12; m++) {
    let i = 0;
    while (i < checkpoints.length - 1 && checkpoints[i + 1] < m) i++;
    const a = checkpoints[i];
    const b = checkpoints[i + 1];
    const va = cum[i];
    const vb = cum[i + 1];
    const frac = b > a ? (m - a) / (b - a) : 1;
    months.push(va + (vb - va) * frac);
  }
  return months.map((v, i) => Math.max(v - (i === 0 ? 0 : months[i - 1]), 0));
}

function sparklineSVG(row) {
  const deltas = buildMonthlySeries(row);
  const max = Math.max(...deltas, 1);
  const w = 96;
  const h = 24;
  const barW = w / deltas.length - 2;
  const bars = deltas
    .map((v, i) => {
      const barH = Math.max((v / max) * h, 1);
      const x = i * (w / deltas.length);
      const y = h - barH;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="1" />`;
    })
    .join('');
  const wrapper = document.createElement('div');
  wrapper.className = 'sparkline';
  wrapper.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${bars}</svg>`;
  return wrapper;
}

function buildForecastTree(forecast, models) {
  const categories = forecast
    .filter((r) => r['Уровень'] === 'категория')
    .map((row) => ({ row, prefix: numericPrefix(row['Объект']) || row['Объект'], children: [] }));
  const subcategories = forecast
    .filter((r) => r['Уровень'] === 'подкатегория')
    .map((row) => ({ row, prefix: numericPrefix(row['Объект']) || row['Объект'], children: [] }));
  const modelNodes = forecast.filter((r) => r['Уровень'] === 'модель').map((row) => ({ row, children: [] }));

  const catByPrefix = new Map(categories.map((c) => [c.prefix, c]));
  const orphanSubs = [];
  subcategories.forEach((sub) => {
    const parentPrefix = sub.prefix.includes('.') ? sub.prefix.split('.')[0] : null;
    const parent = parentPrefix ? catByPrefix.get(parentPrefix) : null;
    if (parent) parent.children.push(sub);
    else orphanSubs.push(sub);
  });

  const subByPrefix = new Map(subcategories.map((s) => [s.prefix, s]));
  const unassignedModels = [];
  modelNodes.forEach((node) => {
    const info = models.find((m) => m['Модель'] === node.row['Объект']);
    const subPrefix = info ? numericPrefix(info['Подкатегория']) : null;
    const catPrefix = info ? numericPrefix(info['Категория']) : null;
    if (subPrefix && subByPrefix.has(subPrefix)) subByPrefix.get(subPrefix).children.push(node);
    else if (catPrefix && catByPrefix.has(catPrefix)) catByPrefix.get(catPrefix).children.push(node);
    else unassignedModels.push(node);
  });

  const roots = [...categories, ...orphanSubs];
  if (unassignedModels.length) {
    roots.push({ row: { 'Объект': 'Без привязки к категории', 'Уровень': null }, children: unassignedModels, isBucket: true });
  }
  return roots;
}

function renderTreeNode(node, depth, horizon) {
  const hasChildren = node.children && node.children.length > 0;
  const rowEl = el('div', { class: `tree-row depth-${depth}` });
  rowEl.appendChild(
    hasChildren
      ? el('button', { class: 'tree-toggle', 'aria-label': 'Раскрыть', text: '›' })
      : el('span', { class: 'tree-toggle-spacer' })
  );
  rowEl.appendChild(el('span', { class: 'tree-name', text: node.row['Объект'] ?? '' }));
  if (node.row['Уровень'] === 'категория') {
    rowEl.appendChild(sparklineSVG(node.row));
  }
  if (node.row['Уровень']) {
    rowEl.appendChild(trendBadge(node.row['Тренд']));
    rowEl.appendChild(forecastNumberCell(node.row, horizon));
  }

  const wrap = el('div', { class: 'tree-item' });
  wrap.appendChild(rowEl);

  if (hasChildren) {
    const inner = el('div', { class: 'tree-panel-inner' });
    node.children.forEach((child) => inner.appendChild(renderTreeNode(child, depth + 1, horizon)));
    const panel = el('div', { class: 'tree-panel' }, inner);
    wrap.appendChild(panel);
    rowEl.addEventListener('click', () => {
      rowEl.classList.toggle('expanded');
      panel.classList.toggle('expanded');
    });
  }

  return wrap;
}

export function renderForecast(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Прогноз продаж' }));

  if (data.forecast.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const horizons = ['1', '3', '6', '9', '12'];
  const segmented = el('div', { class: 'segmented' });
  const buttons = horizons.map((h) => {
    const btn = el('button', { class: `segmented-btn ${h === forecastHorizon ? 'active' : ''}`, text: `${h} мес` });
    btn.addEventListener('click', () => {
      forecastHorizon = h;
      draw();
    });
    segmented.appendChild(btn);
    return btn;
  });
  view.appendChild(segmented);

  const cardsHost = el('div', { class: 'kpi-grid forecast-summary' });
  view.appendChild(cardsHost);

  view.appendChild(el('h3', { text: 'По категориям, подкатегориям и моделям' }));
  const treeHost = el('div', { class: 'tree' });
  view.appendChild(treeHost);

  function draw() {
    buttons.forEach((btn, i) => btn.classList.toggle('active', horizons[i] === forecastHorizon));

    const categoryRows = data.forecast.filter((r) => r['Уровень'] === 'категория');
    const totalUnits = categoryRows.reduce((sum, r) => sum + (Number(forecastValue(r, forecastHorizon)) || 0), 0);
    const isTwelve = forecastHorizon === '12';
    const totalMoney = isTwelve
      ? categoryRows.reduce((sum, r) => sum + (Number(r['Прогноз_12м_тг']) || 0), 0)
      : null;
    const avgTrend = categoryRows.length
      ? categoryRows.reduce((sum, r) => sum + (Number(r['Тренд']) || 0), 0) / categoryRows.length
      : null;
    const highAccuracyShare = categoryRows.length
      ? categoryRows.filter((r) => r['Точность'] === 'высокая').length / categoryRows.length
      : 0;

    cardsHost.innerHTML = '';
    cardsHost.appendChild(kpiTile('Прогноз, шт', fmtNumber(totalUnits), `горизонт ${forecastHorizon} мес · только уровень категорий`));
    if (isTwelve) {
      cardsHost.appendChild(kpiTile('Прогноз, ₸', fmtMoney(totalMoney), '12 мес · только уровень категорий'));
    }
    cardsHost.appendChild(kpiTile('Тренд год к году', avgTrend !== null ? trendPercentText(avgTrend) : '—', 'среднее по категориям'));
    cardsHost.appendChild(kpiTile('Доля с высокой точностью', `${(highAccuracyShare * 100).toFixed(0)}%`, 'из строк уровня категория'));

    treeHost.innerHTML = '';
    const tree = buildForecastTree(data.forecast, data.models);
    tree.forEach((node) => treeHost.appendChild(renderTreeNode(node, 0, forecastHorizon)));
  }

  draw();
  container.appendChild(view);
}

// ---- Новинки в ожидании сезона ----

const SEASON_BUCKETS = [
  { label: 'Сезон идёт сейчас', test: (m) => m === 0 },
  { label: 'Через 1–2 месяца', test: (m) => m >= 1 && m <= 2 },
  { label: 'Через 3–5 месяцев', test: (m) => m >= 3 && m <= 5 },
  { label: 'Через 6+ месяцев', test: (m) => m >= 6 },
];

function statPair(label, value) {
  const wrap = el('div', { class: 'stat-pair' });
  wrap.appendChild(el('span', { class: 'stat-label', text: label }));
  wrap.appendChild(el('span', { class: 'stat-value', text: value }));
  return wrap;
}

function newItemCard(row) {
  const riskClass = RISK_CLASS[row['Риск']] || 'risk-mid';
  const card = el('div', { class: `newitem-card ${riskClass}` });
  card.appendChild(el('div', { class: 'newitem-title', text: row['Модель'] ?? '' }));
  card.appendChild(el('div', { class: 'newitem-meta', text: row['Категория'] ?? '' }));
  const stats = el('div', { class: 'newitem-stats' });
  stats.appendChild(statPair('Остаток', `${fmtNumber(row['Остаток_шт'])} шт · ${fmtMoney(row['Остаток_тг'])}`));
  stats.appendChild(statPair('Сезон с', row['Сезон_старт'] ?? ''));
  stats.appendChild(statPair('Ожид. продажи', `${fmtNumber(row['Ожид_продажи_шт'])} шт`));
  card.appendChild(stats);
  card.appendChild(el('span', { class: `badge ${riskClass}`, text: `риск: ${row['Риск']}` }));
  if (row['Комментарий']) card.appendChild(el('div', { class: 'newitem-comment', text: row['Комментарий'] }));
  return card;
}

export function renderNewItems(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Новинки в ожидании сезона' }));

  if (data.newitems.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const totalCount = data.newitems.length;
  const totalCapital = data.newitems.reduce((sum, r) => sum + (Number(r['Остаток_тг']) || 0), 0);
  const highRiskCount = data.newitems.filter((r) => r['Риск'] === 'высокий').length;

  const cards = el('div', { class: 'kpi-grid' });
  cards.appendChild(kpiTile('Всего новинок', fmtNumber(totalCount), 'позиций в ожидании сезона'));
  cards.appendChild(kpiTile('Капитал в новинках', fmtMoney(totalCapital), 'по себестоимости остатка'));
  cards.appendChild(kpiTile('Высокий риск', fmtNumber(highRiskCount), 'сезон дальше 6 месяцев'));
  view.appendChild(cards);

  SEASON_BUCKETS.forEach((bucket, idx) => {
    const rows = data.newitems.filter((r) => bucket.test(Number(r['Мес_до_сезона'])));
    if (rows.length === 0) return;

    const section = el('div', { class: `collapsible ${idx === 0 ? 'expanded' : ''}` });
    const header = el('button', { class: 'collapsible-header' }, [
      el('span', { class: 'tree-toggle', text: '›' }),
      el('span', { text: `${bucket.label} (${rows.length})` }),
    ]);
    header.addEventListener('click', () => section.classList.toggle('expanded'));
    section.appendChild(header);

    const inner = el('div', { class: 'collapsible-panel-inner newitems-grid' });
    rows.forEach((r) => inner.appendChild(newItemCard(r)));
    section.appendChild(el('div', { class: 'collapsible-panel' }, inner));

    view.appendChild(section);
  });

  view.appendChild(
    el('div', {
      class: 'plaque',
      text:
        'Эти позиции не являются неликвидом. Их сезон ещё не наступил. Не включать их в списки на уценку до окончания их окна продаж.',
    })
  );

  container.appendChild(view);
}

// ---- Клиенты ----

const CLIENT_STATUSES = ['растёт', 'стабилен', 'падает', 'новый', 'ушёл'];

function clientStatusBadge(status) {
  const cls = CLIENT_STATUS_CLASS[status] || 'client-stable';
  return el('span', { class: `badge ${cls}`, text: status });
}

export function renderClients(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Клиенты' }));

  if (data.clients.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const total = data.clients.length;
  const churned = data.clients.filter((r) => r['Статус'] === 'ушёл').length;
  const isNew = data.clients.filter((r) => r['Статус'] === 'новый').length;
  const active = total - churned;
  const retentionRow = data.retention.find((r) => String(r['Показатель'] || '').includes('Выручка ушедших'));
  const churnedRevenue = retentionRow
    ? Number(retentionRow['Значение']) || 0
    : data.clients.filter((r) => r['Статус'] === 'ушёл').reduce((sum, r) => sum + (Number(r['Оборот_пред']) || 0), 0);

  const cards = el('div', { class: 'kpi-grid' });
  cards.appendChild(kpiTile('Всего клиентов', fmtNumber(total), 'в загруженном срезе'));
  cards.appendChild(kpiTile('Активных', fmtNumber(active), 'не помечены как ушедшие'));
  cards.appendChild(kpiTile('Ушедших', fmtNumber(churned), ''));
  cards.appendChild(kpiTile('Новых', fmtNumber(isNew), ''));
  cards.appendChild(kpiTile('Оборот ушедших', fmtMoney(churnedRevenue), 'их оборот в прошлом периоде'));
  view.appendChild(cards);

  const toolbar = el('div', { class: 'toolbar' });
  const search = el('input', { type: 'text', placeholder: 'Поиск по клиенту…', class: 'search-input' });
  const segmented = el('div', { class: 'segmented' });
  let statusFilter = '';
  const segButtons = ['', ...CLIENT_STATUSES].map((s) => {
    const btn = el('button', { class: `segmented-btn ${s === '' ? 'active' : ''}`, text: s === '' ? 'Все' : s });
    btn.addEventListener('click', () => {
      statusFilter = s;
      segButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      drawTable();
    });
    segmented.appendChild(btn);
    return btn;
  });
  toolbar.append(search, segmented);
  view.appendChild(toolbar);

  const tableHost = el('div');
  view.appendChild(tableHost);

  const columns = Object.keys(data.clients[0]);
  function drawTable() {
    const query = search.value.trim().toLowerCase();
    const filtered = data.clients.filter((r) => {
      if (statusFilter && r['Статус'] !== statusFilter) return false;
      if (query && !String(r['Клиент'] ?? '').toLowerCase().includes(query)) return false;
      return true;
    });
    tableHost.innerHTML = '';
    tableHost.appendChild(
      buildSortableTable(columns, filtered, {
        renderCell: (col, value) => {
          if (col === 'Статус') return el('td', {}, clientStatusBadge(value));
          if (['Оборот_пред', 'Оборот_тек', 'Оценка_ВП'].includes(col)) return el('td', { text: fmtMoney(value) });
          if (['Дельта', 'Маржа'].includes(col)) return el('td', { text: fmtPercent(value) });
          return el('td', { text: typeof value === 'number' ? fmtNumber(value) : value ?? '' });
        },
      })
    );
  }
  search.addEventListener('input', drawTable);
  drawTable();

  if (data.retention.length > 0) {
    view.appendChild(el('h3', { text: 'Отток' }));
    const retGrid = el('div', { class: 'kpi-grid' });
    data.retention.forEach((r) => {
      retGrid.appendChild(kpiTile(r['Показатель'] ?? '', fmtNumber(r['Значение']), r['Подпись'] ?? ''));
    });
    view.appendChild(retGrid);
  }

  container.appendChild(view);
}

// ---- Качество данных ----

function flagClass(flag) {
  return `flag-${String(flag).toLowerCase().replace(/\s+/g, '-')}`;
}

export function renderDataQuality(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Качество данных' }));

  if (data.dataquality.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const totalPositions = data.dataquality.reduce((sum, r) => sum + (Number(r['Позиций']) || 0), 0);
  const totalStock = data.dataquality.reduce((sum, r) => sum + (Number(r['Остаток_тг']) || 0), 0);
  const kpiTotalRow = data.kpi.find((r) => String(r['Показатель'] || '').includes('Остаток по себестоимости'));
  const kpiTotal = kpiTotalRow ? Number(kpiTotalRow['Значение']) || 0 : 0;
  const pctOfCapital = kpiTotal > 0 ? (totalStock / kpiTotal) * 100 : null;

  const columns = Object.keys(data.dataquality[0]);
  view.appendChild(
    buildSortableTable(columns, data.dataquality, {
      renderCell: (col, value) => {
        if (col === 'Флаг') return el('td', {}, el('span', { class: `badge ${flagClass(value)}`, text: value }));
        if (col === 'Остаток_тг') return el('td', { text: fmtMoney(value) });
        return el('td', { text: typeof value === 'number' ? fmtNumber(value) : value ?? '' });
      },
    })
  );

  const plaqueText =
    pctOfCapital !== null
      ? `Позиции с этими флагами выведены из автоматических решений. Суммарно это ${fmtNumber(totalPositions)} позиций на ${fmtMoney(totalStock)} — ${pctOfCapital.toFixed(1)}% капитала.`
      : `Позиции с этими флагами выведены из автоматических решений. Суммарно это ${fmtNumber(totalPositions)} позиций на ${fmtMoney(totalStock)}.`;
  view.appendChild(el('div', { class: 'plaque', text: plaqueText }));

  container.appendChild(view);
}

// ---- Методика ----

export function renderNarrative(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view narrative-view' });
  view.appendChild(el('h2', { text: 'Методика' }));

  if (!data.narrative) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const html = marked.parse(data.narrative);
  view.appendChild(el('div', { class: 'narrative-content', html }));
  container.appendChild(view);
}

export { fmtMoney, fmtNumber, fmtPercent, statusBadge };
