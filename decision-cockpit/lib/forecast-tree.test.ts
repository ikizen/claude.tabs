import { describe, it, expect } from 'vitest';
import { buildForecastTree, monthlySeries } from './forecast-tree';
import type { ReportRow } from './parse';

const cat = (name: string): ReportRow => ({ 'Объект': name, 'Уровень': 'категория' });
const sub = (name: string): ReportRow => ({ 'Объект': name, 'Уровень': 'подкатегория' });
const model = (name: string): ReportRow => ({ 'Объект': name, 'Уровень': 'модель' });

describe('buildForecastTree', () => {
  it('строит иерархию категория → подкатегория → модель по префиксам', () => {
    const forecast = [cat('1 - Обувь'), sub('1.1 - Кроссовки'), model('Модель А')];
    const models: ReportRow[] = [
      { 'Модель': 'Модель А', 'Категория': '1 - Обувь', 'Подкатегория': '1.1 - Кроссовки' },
    ];
    const tree = buildForecastTree(forecast, models);
    expect(tree).toHaveLength(1);
    expect(tree[0].row['Объект']).toBe('1 - Обувь');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].row['Объект']).toBe('Модель А');
  });

  it('поднимает подкатегорию-сироту на верхний уровень', () => {
    const forecast = [sub('9.9 - Без категории')];
    const tree = buildForecastTree(forecast, []);
    expect(tree).toHaveLength(1);
    expect(tree[0].row['Уровень']).toBe('подкатегория');
  });

  it('привязывает модель напрямую к категории, если подкатегория не найдена', () => {
    const forecast = [cat('2 - Одежда'), model('Модель Б')];
    const models: ReportRow[] = [
      { 'Модель': 'Модель Б', 'Категория': '2 - Одежда', 'Подкатегория': '2.9 - Нет такой' },
    ];
    const tree = buildForecastTree(forecast, models);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].row['Объект']).toBe('Модель Б');
  });

  it('складывает непривязанные модели в корзину «Без привязки к категории»', () => {
    const forecast = [cat('1 - Обувь'), model('Потерянная модель')];
    const tree = buildForecastTree(forecast, []);
    const bucket = tree.find((n) => n.isBucket);
    expect(bucket).toBeDefined();
    expect(bucket!.children).toHaveLength(1);
    expect(bucket!.children[0].row['Объект']).toBe('Потерянная модель');
  });

  it('не создаёт корзину, если все модели привязаны', () => {
    const forecast = [cat('1 - Обувь')];
    const tree = buildForecastTree(forecast, []);
    expect(tree.every((n) => !n.isBucket)).toBe(true);
  });
});

describe('monthlySeries', () => {
  it('возвращает 12 месячных приращений', () => {
    const row: ReportRow = {
      'Прогноз_1м': 10,
      'Прогноз_3м': 30,
      'Прогноз_6м': 60,
      'Прогноз_9м': 90,
      'Прогноз_12м': 120,
    };
    const series = monthlySeries(row);
    expect(series).toHaveLength(12);
  });

  it('линейно интерполирует между контрольными точками', () => {
    const row: ReportRow = {
      'Прогноз_1м': 10,
      'Прогноз_3м': 30,
      'Прогноз_6м': 60,
      'Прогноз_9м': 90,
      'Прогноз_12м': 120,
    };
    const series = monthlySeries(row);
    // Месяц 2 — середина между точками 1м (10) и 3м (30): кумулятивно 20 → приращение 10
    expect(series[0]).toBeCloseTo(10);
    expect(series[1]).toBeCloseTo(10);
  });

  it('сумма приращений равна значению контрольной точки 12м', () => {
    const row: ReportRow = {
      'Прогноз_1м': 5,
      'Прогноз_3м': 17,
      'Прогноз_6м': 40,
      'Прогноз_9м': 70,
      'Прогноз_12м': 100,
    };
    const series = monthlySeries(row);
    const total = series.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(100);
  });

  it('не выдаёт отрицательных приращений даже при убывающем прогнозе', () => {
    const row: ReportRow = {
      'Прогноз_1м': 100,
      'Прогноз_3м': 50,
      'Прогноз_6м': 40,
      'Прогноз_9м': 30,
      'Прогноз_12м': 20,
    };
    const series = monthlySeries(row);
    expect(series.every((v) => v >= 0)).toBe(true);
  });

  it('обрабатывает строковые и пустые значения как 0', () => {
    const series = monthlySeries({});
    expect(series).toHaveLength(12);
    expect(series.every((v) => v === 0)).toBe(true);
  });
});
