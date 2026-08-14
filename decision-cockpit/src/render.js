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

// ---- Обзор ----

function kpiCard(row) {
  const evalKey = String(row['Оценка'] || 'neutral').toLowerCase();
  const cls = EVAL_CLASS[evalKey] || 'eval-neutral';
  const card = el('div', { class: `kpi-card ${cls}` });
  card.appendChild(el('div', { class: 'kpi-label', text: row['Показатель'] ?? '' }));
  const rawValue = row['Значение'];
  const displayValue = typeof rawValue === 'number' && Math.abs(rawValue) < 5 && !Number.isInteger(rawValue * 10)
    ? fmtNumber(rawValue)
    : fmtNumber(rawValue);
  card.appendChild(el('div', { class: 'kpi-value', text: displayValue }));
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
      el('td', {}, statusBadge(s['Статус'])),
      el('td', { text: fmtNumber(s['Моделей']) }),
      el('td', { text: fmtMoney(s['Остаток']) }),
      el('td', { text: `${pct.toFixed(1)}%` }),
      el('td', { text: fmtMoney(s['Излишек']) }),
      el('td', { text: fmtMoney(s['Возврат_консерв'] ?? s['Возврат_база']) }),
      el('td', { text: fmtMoney(s['Возврат_базовый'] ?? s['Возврат_база']) }),
      el('td', { text: fmtMoney(s['Возврат_агрессив']) }),
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
    renderCell: (col, value, row) => {
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
    sorted.forEach((row) => {
      const tr = el('tr');
      columns.forEach((col) => {
        if (col === 'Статус') {
          tr.appendChild(el('td', {}, statusBadge(row[col])));
          return;
        }
        if (opts.renderCell) {
          tr.appendChild(opts.renderCell(col, row[col], row));
          return;
        }
        const value = row[col];
        tr.appendChild(el('td', { text: typeof value === 'number' ? fmtNumber(value) : value ?? '' }));
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
        renderCell: (col, value, row) => {
          if (col === 'Статус') return el('td', {}, statusBadge(value));
          if (['Остаток', 'SKU', 'Выручка12', 'ВП12'].includes(col)) return el('td', { text: fmtNumber(value) });
          if (['Маржа', 'GMROI'].includes(col)) return el('td', { text: fmtNumber(value) });
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

export function renderModels(container, data) {
  container.innerHTML = '';
  const view = el('div', { class: 'view' });
  view.appendChild(el('h2', { text: 'Модели' }));

  if (data.models.length === 0) {
    view.appendChild(emptyState('Нет данных.'));
    container.appendChild(view);
    return;
  }

  const columns = Object.keys(data.models[0]);
  const statuses = [...new Set(data.models.map((r) => r['Статус']).filter(Boolean))];
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
    const filtered = data.models.filter((r) => {
      if (query && !String(r['Модель'] ?? '').toLowerCase().includes(query)) return false;
      if (statusFilter && r['Статус'] !== statusFilter) return false;
      if (categoryFilter && r['Категория'] !== categoryFilter) return false;
      return true;
    });
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
  statusSelect.addEventListener('change', draw);
  categorySelect.addEventListener('change', draw);
  draw();

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
