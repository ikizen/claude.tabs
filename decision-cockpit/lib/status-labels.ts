// Статусы товара приходят в отчёте на английском (исторически — коды системы
// закупок). Для конечного клиента показываем русский ярлык на бейдже,
// исходный код и объяснение — во всплывающей подсказке.

export type StatusInfo = { label: string; description: string; tone: StatusTone };

export type StatusTone =
  | 'buy'
  | 'push'
  | 'hold'
  | 'stopbuy'
  | 'bundle'
  | 'discount'
  | 'liquidate'
  | 'newarrival'
  | 'neutral';

export const STATUS_INFO: Record<string, StatusInfo> = {
  'BUY MORE': {
    label: 'Докупить',
    description: 'Сезон стартует, текущего запаса не хватит — нужно дозаказать.',
    tone: 'buy',
  },
  PUSH: {
    label: 'Продавать',
    description: 'Остаток невелик, но подтверждённого спроса для дозаказа нет — продавать по обычной цене, закупку не увеличивать.',
    tone: 'push',
  },
  HOLD: {
    label: 'Не трогать',
    description: 'Запас в норме — просто следить за темпом продаж.',
    tone: 'hold',
  },
  'STOP BUY': {
    label: 'Прекратить закупку',
    description: 'Запас превышает норму — закупку остановить до распродажи текущего остатка.',
    tone: 'stopbuy',
  },
  BUNDLE: {
    label: 'Продать комплектом',
    description: 'Остаток избыточен — предложить как микс-бокс или довесок к ходовому товару.',
    tone: 'bundle',
  },
  DISCOUNT: {
    label: 'Уценить',
    description: 'Запас на 3–6 сезонов вперёд — снизить цену, чтобы ускорить оборот.',
    tone: 'discount',
  },
  LIQUIDATE: {
    label: 'Списать',
    description: 'Продаж почти нет или отгружается ниже себестоимости — избавиться от остатка лотом.',
    tone: 'liquidate',
  },
};

export const NEW_ARRIVAL_STATUS: StatusInfo = {
  label: 'Новинка',
  description:
    'Сезон этого товара ещё впереди — вопреки статусу из отчёта, он не включается в списки на уценку/ликвидацию, см. вкладку «Новинки».',
  tone: 'newarrival',
};

export function statusInfo(code: string | undefined | null): StatusInfo {
  if (!code) return { label: '—', description: '', tone: 'neutral' };
  return STATUS_INFO[code] ?? { label: code, description: '', tone: 'neutral' };
}

export const ABC_CLASS_INFO: Record<string, string> = {
  A: 'Класс A — держим наличие всегда, первый приоритет закупки.',
  B: 'Класс B — закупаем по плану, второй приоритет.',
  C: 'Класс C — под заказ или вывод из ассортимента.',
};

export const EFFORT_LABEL: Record<string, string> = {
  'низкие': 'низкие усилия',
  'средние': 'средние усилия',
  'высокие': 'высокие усилия',
};
