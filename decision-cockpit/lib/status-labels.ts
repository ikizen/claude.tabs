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

// Словарь reasonCodes зашит в код сайта (одинаков для всех отчётов) — сайт
// только переводит присланные коды на человеческий язык, не изобретает их.
export const REASON_CODE_LABELS: Record<string, string> = {
  ZERO_SALES_YEAR: 'ни одной продажи за год',
  EXPOSED: 'товар был на складе достаточно долго',
  NOT_EXPOSED: 'товар появился недавно, сезон мог не наступить',
  NO_SEASON_SALES: 'нет продаж в своё сезонное окно',
  COVERAGE_GT_3_5: 'запас больше 3,5 сезонов',
  MARGIN_OK: 'маржа достаточна для набора',
  MARGIN_LOW: 'маржа слишком низкая',
  COVERAGE_GT_2: 'запас 2–3,5 сезона',
  COVERAGE_GT_1_3: 'запас 1,3–2 сезона',
  COVERAGE_NORMAL: 'запас в норме',
  COVERAGE_LT_0_8: 'запаса меньше 80% от сезонной нормы',
  CANDIDATE_NOT_ORDER: 'кандидат на дозаказ, не готовая команда',
  NEGATIVE_MARGIN: 'отрицательная маржа',
  DATA_ANOMALY: 'подозрение на ошибку в учёте',
  NEW: 'новинка, мало истории',
  THIN: 'мало продаж, статистика недостоверна',
  ANNUAL_DENOMINATOR: 'трактуется как круглогодичный товар, не сезонный',
};

export function reasonCodeLabel(code: string): string {
  return REASON_CODE_LABELS[code] ?? code;
}

export type FlagAxis = 'dataQuality' | 'history' | 'economics' | 'confidence';

export const FLAG_AXIS_LABELS: Record<FlagAxis, string> = {
  dataQuality: 'Данные',
  history: 'История',
  economics: 'Экономика',
  confidence: 'Уверенность',
};

export const FLAG_VALUE_LABELS: Record<FlagAxis, Record<string, string>> = {
  dataQuality: { OK: 'в порядке', 'CHECK DATA': 'требует проверки' },
  history: { ENOUGH: 'достаточно', THIN: 'мало (THIN)', NEW: 'новинка' },
  economics: { OK: 'в норме', 'PRICE FIX': 'нужен пересмотр цены' },
  confidence: { 'высокая': 'высокая', 'средняя': 'средняя', 'низкая': 'низкая' },
};

export function flagValueLabel(axis: FlagAxis, value: string): string {
  return FLAG_VALUE_LABELS[axis]?.[value] ?? value ?? '—';
}
