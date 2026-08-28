import { marked } from 'marked';
import { parseReport } from './parse.js';
import {
  renderOverview,
  renderActions7d,
  renderForecast,
  renderNewItems,
  renderDeficit,
  renderCategoryLikeTable,
  renderModels,
  renderClients,
  renderDataQuality,
  renderWeekly,
  renderMonthCmp,
  renderWeekCmp,
  renderProcurement,
  renderTasks,
  renderNarrative,
} from './render.js';

const topbar = document.querySelector('.topbar');
const tabsNav = document.getElementById('tabs');
const viewsHost = document.getElementById('views');
const reportMetaHost = document.getElementById('report-meta');
const themeToggle = document.getElementById('theme-toggle');

const THEME_KEY = 'decision-cockpit:theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    stored = null;
  }
  const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — тема просто не запомнится
  }
});

initTheme();

let currentData = null;
let currentFilename = '';
let activeTab = 'upload';

// Всегда видимые вкладки не меняются доработкой v2; новые — скрыты, если секции нет в файле.
const TAB_DEFS = [
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

function visibleTabIds(data) {
  const ids = ['upload'];
  TAB_DEFS.forEach((def) => {
    if (def.always || (data && data[def.dataKey] && data[def.dataKey].length > 0)) {
      ids.push(def.id);
    }
  });
  return ids;
}

function buildTabsNav(data) {
  tabsNav.innerHTML = '';
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'tab-btn';
  uploadBtn.dataset.tab = 'upload';
  uploadBtn.textContent = 'Загрузка';
  tabsNav.appendChild(uploadBtn);

  TAB_DEFS.forEach((def) => {
    if (!(def.always || (data && data[def.dataKey] && data[def.dataKey].length > 0))) return;
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.tab = def.id;
    btn.textContent = def.label;
    tabsNav.appendChild(btn);
  });
}

function setActiveTab(tab) {
  const allowed = visibleTabIds(currentData);
  activeTab = allowed.includes(tab) ? tab : 'upload';
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });
  renderActiveTab();
}

function renderActiveTab() {
  if (!currentData) {
    renderUploadView();
    return;
  }
  switch (activeTab) {
    case 'upload':
      renderUploadView();
      break;
    case 'overview':
      renderOverview(viewsHost, currentData);
      break;
    case 'actions7d':
      renderActions7d(viewsHost, currentData);
      break;
    case 'forecast':
      renderForecast(viewsHost, currentData);
      break;
    case 'newitems':
      renderNewItems(viewsHost, currentData);
      break;
    case 'weekly':
      renderWeekly(viewsHost, currentData);
      break;
    case 'monthcmp':
      renderMonthCmp(viewsHost, currentData);
      break;
    case 'weekcmp':
      renderWeekCmp(viewsHost, currentData);
      break;
    case 'deficit':
      renderDeficit(viewsHost, currentData);
      break;
    case 'procurement':
      renderProcurement(viewsHost, currentData);
      break;
    case 'categories':
      renderCategoryLikeTable(viewsHost, currentData.categories, 'Категории', 'Нет данных по категориям.');
      break;
    case 'subcategories':
      renderCategoryLikeTable(viewsHost, currentData.subcategories, 'Подкатегории', 'Нет данных по подкатегориям.');
      break;
    case 'models':
      renderModels(viewsHost, currentData);
      break;
    case 'clients':
      renderClients(viewsHost, currentData);
      break;
    case 'dataquality':
      renderDataQuality(viewsHost, currentData);
      break;
    case 'tasks':
      renderTasks(viewsHost, currentData);
      break;
    case 'narrative':
      renderNarrative(viewsHost, currentData);
      break;
    default:
      renderUploadView();
  }
}

function renderUploadView() {
  viewsHost.innerHTML = '';
  const view = document.createElement('div');
  view.className = 'view upload-view';

  const dropzone = document.createElement('div');
  dropzone.className = 'dropzone';
  dropzone.innerHTML = `
    <div class="dropzone-icon">📄</div>
    <div class="dropzone-text">Перетащите MD-файл отчёта сюда</div>
    <div class="dropzone-sub">или</div>
  `;
  const pickBtn = document.createElement('button');
  pickBtn.className = 'btn btn-primary';
  pickBtn.textContent = 'Выбрать файл';
  dropzone.appendChild(pickBtn);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.md,text/markdown';
  fileInput.hidden = true;
  dropzone.appendChild(fileInput);

  pickBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  });

  view.appendChild(dropzone);

  if (currentData) {
    const summary = document.createElement('div');
    summary.className = 'upload-summary';

    const title = document.createElement('div');
    title.className = 'upload-summary-title';
    title.textContent = `Файл загружен: ${currentFilename}`;
    summary.appendChild(title);

    const metaTitle = currentData.meta['Заголовок'];
    const metaDate = currentData.meta['Дата отчёта'];
    if (metaTitle || metaDate) {
      const line = document.createElement('div');
      line.className = 'upload-summary-line';
      line.textContent = [metaTitle, metaDate ? `дата отчёта: ${metaDate}` : null].filter(Boolean).join(' · ');
      summary.appendChild(line);
    }

    if (currentData.warnings.length > 0) {
      const warnBox = document.createElement('div');
      warnBox.className = 'warning-box';
      const warnTitle = document.createElement('div');
      warnTitle.className = 'warning-title';
      warnTitle.textContent = 'Внимание — распознано не всё:';
      warnBox.appendChild(warnTitle);
      const list = document.createElement('ul');
      currentData.warnings.forEach((w) => {
        const li = document.createElement('li');
        li.textContent = w;
        list.appendChild(li);
      });
      warnBox.appendChild(list);
      summary.appendChild(warnBox);
    }

    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn-primary';
    openBtn.textContent = 'Открыть дашборд';
    openBtn.addEventListener('click', () => setActiveTab('overview'));
    summary.appendChild(openBtn);

    view.appendChild(summary);
  }

  viewsHost.appendChild(view);
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result);
    currentFilename = file.name;
    currentData = parseReport(text);

    if (!currentData.recognized) {
      tabsNav.hidden = true;
      viewsHost.innerHTML = '';
      const view = document.createElement('div');
      view.className = 'view';
      view.innerHTML = `
        <h2>Не удалось распознать структуру</h2>
        <p class="empty-state">Файл не соответствует контракту и заголовки не найдены. Показываем как обычный markdown.</p>
      `;
      const pre = document.createElement('div');
      pre.className = 'narrative-content';
      pre.innerHTML = marked.parse(text);
      view.appendChild(pre);
      viewsHost.appendChild(view);
      updateReportMetaBadge();
      return;
    }

    buildTabsNav(currentData);
    tabsNav.hidden = false;
    updateReportMetaBadge();
    setActiveTab('upload');
  };
  reader.readAsText(file);
}

function updateReportMetaBadge() {
  if (!currentData) {
    reportMetaHost.textContent = '';
    return;
  }
  const title = currentData.meta['Заголовок'];
  reportMetaHost.textContent = title ? title : currentFilename;
}

tabsNav.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  setActiveTab(btn.dataset.tab);
});

// Крупный заголовок топбара слегка сжимается при прокрутке страницы.
window.addEventListener('scroll', () => {
  topbar.classList.toggle('compact', window.scrollY > 8);
});

renderUploadView();
