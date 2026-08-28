'use client';

import * as React from 'react';

import { KpiCard } from '@/components/kpi-card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ForecastTreeNode } from '@/components/forecast-tree-node';
import { buildForecastTree } from '@/lib/forecast-tree';
import { fmtMoney, fmtNumber } from '@/lib/format';
import type { ParsedReport } from '@/lib/parse';

const HORIZONS = ['1', '3', '6', '9', '12'];

export function ForecastView({ data }: { data: ParsedReport }) {
  const [horizon, setHorizon] = React.useState('12');

  if (data.forecast.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Прогноз продаж</h2>
        <p className="text-sm text-muted-foreground">Нет данных.</p>
      </div>
    );
  }

  // Правило 2: итоги считаются только по строкам уровня "категория" —
  // иначе сумма тысячи стопроцентно ошибочных прогнозов по моделям выдаётся
  // за точную цифру.
  const categoryRows = data.forecast.filter((r) => r['Уровень'] === 'категория');
  const totalUnits = categoryRows.reduce((sum, r) => sum + (Number(r[`Прогноз_${horizon}м`]) || 0), 0);
  const isTwelve = horizon === '12';
  const totalMoney = isTwelve ? categoryRows.reduce((sum, r) => sum + (Number(r['Прогноз_12м_тг']) || 0), 0) : null;
  const avgTrend = categoryRows.length
    ? categoryRows.reduce((sum, r) => sum + (Number(r['Тренд']) || 0), 0) / categoryRows.length
    : null;
  const highAccuracyShare = categoryRows.length
    ? categoryRows.filter((r) => r['Точность'] === 'высокая').length / categoryRows.length
    : 0;

  const tree = buildForecastTree(data.forecast, data.models);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Прогноз продаж</h2>

      <ToggleGroup type="single" value={horizon} onValueChange={(v) => v && setHorizon(v)}>
        {HORIZONS.map((h) => (
          <ToggleGroupItem key={h} value={h}>
            {h} мес
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Прогноз, шт" value={fmtNumber(totalUnits)} caption={`горизонт ${horizon} мес · только уровень категорий`} />
        {isTwelve && <KpiCard label="Прогноз, ₸" value={fmtMoney(totalMoney)} caption="12 мес · только уровень категорий" />}
        <KpiCard
          label="Тренд год к году"
          value={avgTrend !== null ? `${avgTrend - 1 >= 0 ? '+' : ''}${((avgTrend - 1) * 100).toFixed(0)}%` : '—'}
          caption="среднее по категориям"
        />
        <KpiCard label="Доля с высокой точностью" value={`${(highAccuracyShare * 100).toFixed(0)}%`} caption="из строк уровня категория" />
      </div>

      <h3 className="text-sm font-medium text-muted-foreground">По категориям, подкатегориям и моделям</h3>
      <div className="flex flex-col gap-1">
        {tree.map((node, i) => (
          <ForecastTreeNode key={i} node={node} depth={0} horizon={horizon} />
        ))}
      </div>
    </div>
  );
}
