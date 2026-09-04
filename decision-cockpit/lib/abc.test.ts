import { describe, it, expect } from 'vitest';
import { computeAbc, abcSummary } from './abc';

describe('computeAbc', () => {
  it('сортирует строки по убыванию значения и присваивает ранги', () => {
    const rows = [
      { name: 'мелкий', value: 10 },
      { name: 'крупный', value: 80 },
      { name: 'средний', value: 10 },
    ];
    const result = computeAbc(rows, 'value');
    expect(result[0].name).toBe('крупный');
    expect(result[0].rank).toBe(1);
    expect(result[2].rank).toBe(3);
  });

  it('присваивает класс A при кумулятивной доле ровно 0.8', () => {
    const rows = [
      { name: 'a', value: 80 },
      { name: 'b', value: 20 },
    ];
    const result = computeAbc(rows, 'value');
    expect(result[0].abcClass).toBe('A');
  });

  it('присваивает класс B при кумулятивной доле между 0.8 и 0.95', () => {
    const rows = [
      { name: 'a', value: 79 },
      { name: 'b', value: 11 },
      { name: 'c', value: 10 },
    ];
    const result = computeAbc(rows, 'value');
    // cum: 0.79 (A), 0.90 (B), 1.00 (C)
    expect(result[0].abcClass).toBe('A');
    expect(result[1].abcClass).toBe('B');
    expect(result[2].abcClass).toBe('C');
  });

  it('присваивает класс B при кумулятивной доле ровно 0.95', () => {
    const rows = [
      { name: 'a', value: 95 },
      { name: 'b', value: 5 },
    ];
    const result = computeAbc(rows, 'value');
    expect(result[0].abcClass).toBe('B');
    expect(result[1].abcClass).toBe('C');
  });

  it('корректно работает при нулевой сумме значений', () => {
    const rows = [
      { name: 'a', value: 0 },
      { name: 'b', value: 0 },
    ];
    const result = computeAbc(rows, 'value');
    expect(result).toHaveLength(2);
    expect(result[0].share).toBe(0);
    expect(result[0].abcClass).toBe('A');
  });

  // Зафиксированное текущее поведение: cumShare единственной строки равна 1.0,
  // а 1.0 > 0.95 → класс C. Возможно, для коротких списков это стоит пересмотреть.
  it('присваивает единственному элементу класс C (текущее поведение порогов)', () => {
    const result = computeAbc([{ name: 'один', value: 42 }], 'value');
    expect(result).toHaveLength(1);
    expect(result[0].share).toBe(1);
    expect(result[0].abcClass).toBe('C');
  });

  it('трактует нечисловые и отсутствующие значения как 0', () => {
    const rows = [
      { name: 'a', value: 'текст' },
      { name: 'b' },
      { name: 'c', value: 100 },
    ];
    const result = computeAbc(rows as Record<string, unknown>[], 'value');
    expect(result[0].name).toBe('c');
    expect(result[0].share).toBe(1);
  });

  it('не мутирует исходный массив', () => {
    const rows = [
      { name: 'a', value: 1 },
      { name: 'b', value: 2 },
    ];
    computeAbc(rows, 'value');
    expect(rows[0].name).toBe('a');
  });
});

describe('abcSummary', () => {
  it('возвращает три класса, даже если какой-то пуст', () => {
    const rows = computeAbc([{ name: 'a', value: 100 }], 'value');
    const summary = abcSummary(rows);
    expect(summary).toHaveLength(3);
    expect(summary.map((s) => s.cls)).toEqual(['A', 'B', 'C']);
  });

  it('сумма долей по классам равна сумме долей строк', () => {
    const rows = computeAbc(
      [
        { name: 'a', value: 70 },
        { name: 'b', value: 20 },
        { name: 'c', value: 10 },
      ],
      'value'
    );
    const summary = abcSummary(rows);
    const shareTotal = summary.reduce((s, x) => s + x.shareSum, 0);
    expect(shareTotal).toBeCloseTo(1, 10);
    const countTotal = summary.reduce((s, x) => s + x.count, 0);
    expect(countTotal).toBe(3);
  });
});
