import { describe, it, expect } from 'vitest';
import { parseReport, flattenForecastV3, defaultScenario } from './parse';

const MINIMAL_MD = `
<!-- meta:start -->
| Ключ | Значение |
| --- | --- |
| schema_version | 2.0 |
<!-- meta:end -->

<!-- kpi:start -->
| Показатель | Значение |
| --- | --- |
| Выручка | 1000 |
<!-- kpi:end -->

<!-- statuses:start -->
| Категория | Статус |
| --- | --- |
| Обувь | ok |
<!-- statuses:end -->
`;

describe('parseReport: базовый парсинг', () => {
  it('распознаёт отчёт и извлекает обязательные секции', () => {
    const result = parseReport(MINIMAL_MD);
    expect(result.recognized).toBe(true);
    expect(result.meta['schema_version']).toBe(2.0);
    expect(result.kpi).toHaveLength(1);
    expect(result.kpi[0]['Показатель']).toBe('Выручка');
    expect(result.statuses).toHaveLength(1);
  });

  it('приводит числовые ячейки к числам', () => {
    const result = parseReport(MINIMAL_MD);
    expect(result.kpi[0]['Значение']).toBe(1000);
  });

  it('помечает отсутствующие секции в missingSections', () => {
    const result = parseReport(MINIMAL_MD);
    expect(result.missingSections).toContain('forecast');
    expect(result.missingSections).toContain('narrative');
    expect(result.missingSections).not.toContain('kpi');
  });

  it('считает пустой документ нераспознанным', () => {
    const result = parseReport('просто текст без разметки');
    expect(result.recognized).toBe(false);
    expect(result.missingSections).toContain('meta');
  });

  it('предупреждает об отсутствии обязательных секций', () => {
    const md = `
<!-- kpi:start -->
| Показатель | Значение |
| --- | --- |
| Выручка | 1000 |
<!-- kpi:end -->
`;
    const result = parseReport(md);
    expect(result.warnings.some((w) => w.includes('Обязательная секция "meta"'))).toBe(true);
  });
});

describe('parseReport: fallback по заголовкам', () => {
  it('находит секцию по ключевым словам заголовка и предупреждает', () => {
    const md = `
## Мета-информация

| Ключ | Значение |
| --- | --- |
| schema_version | 2.0 |

## KPI

| Показатель | Значение |
| --- | --- |
| Выручка | 500 |
`;
    const result = parseReport(md);
    expect(result.meta['schema_version']).toBe(2.0);
    expect(result.kpi[0]['Значение']).toBe(500);
    expect(result.warnings.some((w) => w.includes('fallback'))).toBe(true);
  });
});

describe('parseReport: версии схемы', () => {
  const TREE_MD = `
<!-- meta:start -->
| Ключ | Значение |
| --- | --- |
| schema_version | 3.0 |
<!-- meta:end -->

<!-- productTree:start -->
\`\`\`json
{
  "categories": [
    {
      "key": "1 - Обувь",
      "stock": 10,
      "sku": 1,
      "revenue12": 1000,
      "gp12": 300,
      "margin": 0.3,
      "subcategories": [
        {
          "key": "1.1 - Кроссовки",
          "stock": 10,
          "sku": 1,
          "revenue12": 1000,
          "gp12": 300,
          "margin": 0.3,
          "models": [
            {
              "name": "Модель А",
              "stockQty": 10,
              "stockValue": 500,
              "unitCost": 50,
              "costSource": "doc",
              "sold12": 20,
              "revenue12": 1000,
              "gp12": 300,
              "margin": 0.3,
              "coverage": 2,
              "coverageBasis": "seasons",
              "flags": { "dataQuality": "ok", "history": "ok", "economics": "ok", "confidence": "high" },
              "headline": "Хорошая позиция",
              "action": "держать",
              "reasonCodes": ["r1"]
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`
<!-- productTree:end -->
`;

  it('при schema_version 3.0 распрямляет productTree в табличные секции', () => {
    const result = parseReport(TREE_MD);
    expect(result.productTree).not.toBeNull();
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]['Категория']).toBe('1 - Обувь');
    expect(result.subcategories).toHaveLength(1);
    expect(result.models).toHaveLength(1);
    expect(result.models[0]['Модель']).toBe('Модель А');
    expect(result.models[0]['Действие']).toBe('держать');
  });

  it('при schema_version < 3 сознательно игнорирует JSON-секцию productTree', () => {
    const md = TREE_MD.replace('schema_version | 3.0', 'schema_version | 2.0');
    const result = parseReport(md);
    expect(result.schemaVersion).toBe(2.0);
    expect(result.productTree).toBeNull();
    expect(result.categories).toHaveLength(0);
  });

  it('предупреждает о битом JSON в productTree', () => {
    const md = TREE_MD.replace('"categories"', '"categories_битое"');
    const result = parseReport(md);
    expect(result.productTree).toBeNull();
    expect(result.warnings.some((w) => w.includes('productTree') && w.includes('JSON'))).toBe(true);
  });

  it('без schema_version считает версию 1.0', () => {
    const md = MINIMAL_MD.replace('| schema_version | 2.0 |\n', '');
    const result = parseReport(md);
    expect(result.schemaVersion).toBe(1.0);
  });
});

describe('parseReport: forecast v3', () => {
  const FORECAST_MD = `
<!-- meta:start -->
| Ключ | Значение |
| --- | --- |
| schema_version | 3.0 |
<!-- meta:end -->

<!-- forecast:start -->
\`\`\`json
{
  "horizonMonths": [1, 3, 6, 9, 12],
  "scenarioNames": ["пессимистичный", "базовый", "оптимистичный"],
  "objects": [
    {
      "name": "1 - Обувь",
      "level": "категория",
      "seasonWindowMonths": [3, 9],
      "baseMonthlyQty": 100,
      "trendRaw": 1.5,
      "trendAdjusted": 1.2,
      "trendClipped": true,
      "accuracy": "высокая",
      "scenarios": {
        "базовый": { "m1": 110, "m3": 340, "m6": 700, "m9": 1050, "m12": 1400, "m12Money": 700000, "price": 500, "margin": 0.3 },
        "пессимистичный": { "m1": 90, "m3": 270, "m6": 550, "m9": 800, "m12": 1000, "m12Money": 500000, "price": 500, "margin": 0.3 }
      }
    }
  ]
}
\`\`\`
<!-- forecast:end -->
`;

  it('парсит JSON-прогноз и распрямляет базовый сценарий', () => {
    const result = parseReport(FORECAST_MD);
    expect(result.forecastV3).not.toBeNull();
    expect(result.forecast).toHaveLength(1);
    expect(result.forecast[0]['Объект']).toBe('1 - Обувь');
    expect(result.forecast[0]['Прогноз_12м']).toBe(1400);
    expect(result.forecast[0]['ТрендОграничен']).toBe(1);
  });

  it('по умолчанию выбирает сценарий «базовый»', () => {
    const result = parseReport(FORECAST_MD);
    expect(defaultScenario(result.forecastV3!)).toBe('базовый');
  });

  it('flattenForecastV3 умеет переключать сценарий', () => {
    const result = parseReport(FORECAST_MD);
    const rows = flattenForecastV3(result.forecastV3!, 'пессимистичный');
    expect(rows[0]['Прогноз_12м']).toBe(1000);
  });

  it('при schema_version < 3 не парсит JSON-прогноз и помечает секцию отсутствующей', () => {
    const md = FORECAST_MD.replace('schema_version | 3.0', 'schema_version | 2.0');
    const result = parseReport(md);
    expect(result.forecastV3).toBeNull();
    expect(result.missingSections).toContain('forecast');
  });
});

describe('parseReport: сверка categoryKeys', () => {
  it('предупреждает о категории, которой нет в дереве товаров', () => {
    const md = `
<!-- meta:start -->
| Ключ | Значение |
| --- | --- |
| schema_version | 3.0 |
| categoryKeys | 1 - Обувь; 2 - Одежда |
<!-- meta:end -->

<!-- productTree:start -->
\`\`\`json
{
  "categories": [
    { "key": "1 - Обувь", "stock": 1, "sku": 1, "revenue12": 1, "gp12": 1, "margin": 0.1, "subcategories": [] }
  ]
}
\`\`\`
<!-- productTree:end -->
`;
    const result = parseReport(md);
    expect(result.warnings.some((w) => w.includes('2 - Одежда'))).toBe(true);
  });

  it('предупреждает о неизвестной категории в разделе «Закуп»', () => {
    const md = `
<!-- meta:start -->
| Ключ | Значение |
| --- | --- |
| categoryKeys | 1 - Обувь |
<!-- meta:end -->

<!-- procurement:start -->
| Категория | Совет |
| --- | --- |
| 9 - Неизвестная | докупить |
<!-- procurement:end -->
`;
    const result = parseReport(md);
    expect(result.warnings.some((w) => w.includes('«Закуп»') && w.includes('9 - Неизвестная'))).toBe(true);
  });
});

describe('parseReport: narrative', () => {
  it('извлекает текст повествования', () => {
    const md = `${MINIMAL_MD}\n<!-- narrative:start -->\nМетодика расчёта описана здесь.\n<!-- narrative:end -->\n`;
    const result = parseReport(md);
    expect(result.narrative).toContain('Методика расчёта');
  });
});
