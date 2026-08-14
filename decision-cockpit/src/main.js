import { marked } from 'marked';
import { parseReport } from './parse.js';
import {
  renderOverview,
  renderActions7d,
  renderDeficit,
  renderCategoryLikeTable,
  renderModels,
  renderNarrative,
} from './render.js';

const tabsNav = document.getElementById('tabs');
const viewsHost = document.getElementById('views');
const reportMetaHost = document.getElementById('report-meta');

let currentData = null;
let currentFilename = '';
let activeTab = 'upload';

const TAB_ORDER = ['upload', 'overview', 'actions7d', 'deficit', 'categories', 'subcategories', 'models', 'narrative'];

function setActiveTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
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
    case 'deficit':
      renderDeficit(viewsHost, currentData);
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
    tabsNav.hidden = false;

    if (!currentData.recognized) {
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

renderUploadView();
