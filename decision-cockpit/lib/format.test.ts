import { describe, it, expect } from 'vitest';
import { fmtNumber, fmtMoney, fmtPercent, numericPrefix } from './format';

describe('fmtNumber', () => {
  it('форматирует число по русской локали', () => {
    const expected = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(1234.5);
    expect(fmtNumber(1234.5)).toBe(expected);
  });

  it('возвращает нечисловое значение как есть', () => {
    expect(fmtNumber('текст')).toBe('текст');
  });
});

describe('fmtMoney', () => {
  it('добавляет знак тенге', () => {
    expect(fmtMoney(100)).toBe(`${fmtNumber(100)} ₸`);
  });

  it('возвращает нечисловое значение как есть', () => {
    expect(fmtMoney('н/д')).toBe('н/д');
  });
});

describe('fmtPercent', () => {
  it('переводит долю в проценты с одним знаком', () => {
    expect(fmtPercent(0.123)).toBe('12.3%');
  });

  it('корректно форматирует ноль и единицу', () => {
    expect(fmtPercent(0)).toBe('0.0%');
    expect(fmtPercent(1)).toBe('100.0%');
  });

  it('возвращает нечисловое значение как есть', () => {
    expect(fmtPercent('—')).toBe('—');
  });
});

describe('numericPrefix', () => {
  it('извлекает целочисленный префикс', () => {
    expect(numericPrefix('3 - Обувь')).toBe('3');
  });

  it('извлекает дробный префикс подкатегории', () => {
    expect(numericPrefix('3.2 - Кроссовки')).toBe('3.2');
  });

  it('работает без пробелов вокруг дефиса', () => {
    expect(numericPrefix('1.1-Подкатегория')).toBe('1.1');
  });

  it('возвращает null, если префикса нет', () => {
    expect(numericPrefix('Просто название')).toBeNull();
  });

  it('возвращает null для дефиса в середине', () => {
    expect(numericPrefix('Название - с дефисом')).toBeNull();
  });

  it('терпимо относится к null и undefined', () => {
    expect(numericPrefix(null)).toBeNull();
    expect(numericPrefix(undefined)).toBeNull();
  });
});
