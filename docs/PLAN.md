# amo-analytics — личная аналитика звонков и лидов из amoCRM

> Статус: черновик v0.1 · Дополняется итеративно
> Автор: Aidyn · Исполнитель: Claude Code

---

## 0. Правила для агента (Claude Code) — прочитать первым

Эти правила важнее скорости. Нарушение любого из них = переделка.

1. **Не выдумывай эндпоинты и параметры.** Все используемые методы API описаны в разделе 4 этого документа. Если нужного метода там нет — остановись и спроси, а не угадывай.
2. **Этап 0 — блокирующий.** Пока не выполнен и не показан результат разведки (раздел 6), не пиши коллектор, схему БД и отчёты. Возможен исход «данных нет» — тогда проект останавливается, и это нормальный результат.
3. **Сырые данные не трогаем.** Всё, что пришло из API, кладётся в БД как есть, включая полный JSON. Любая логика — только поверх, в отдельном слое. Никогда не пересчитывай агрегаты «на лету» при выгрузке.
4. **Никаких мок-данных.** Если API недоступен — падай с понятной ошибкой. Пустой отчёт лучше выдуманного.
5. **Идемпотентность.** Повторный запуск за тот же период не должен создавать дубли и не должен ломать состояние.
6. **Секреты только через переменные окружения.** Токен amoCRM, токен Telegram, ключи Google — никогда в коде, никогда в git.
7. **Все пороги — в конфиг.** Порог дозвона, рабочие часы, часовой пояс, лимит запросов. Ни одного магического числа в коде.
8. **Часовой пояс.** amoCRM отдаёт Unix timestamp (UTC). Все «дни» в отчётах — по `Asia/Almaty` (UTC+5). Ошибка здесь незаметно ломает всю дневную статистику.
9. После каждого этапа — короткий отчёт: что сделано, что не сошлось, какие вопросы к владельцу.

---

## 1. Зачем это

Управлять своей воронкой по фактам, а не по ощущениям. Сейчас нет ответа на вопросы: сколько я реально звоню, какая доля дозвонов, сколько из них доходит до встречи, где лиды застревают.

**Критерий успеха v1:** каждое утро в 9:00 в Telegram приходит сводка за вчера и неделю, и я перестаю открывать amoCRM ради «посмотреть цифры».

**Явно вне рамок v1:** WhatsApp-автоответы, AI-квалификатор для обзвона, речевая аналитика записей. Это отдельные проекты — см. раздел 10.

---

## 2. Ограничения и контекст

| Параметр | Значение |
|---|---|
| Пользователей | 1 (личный инструмент) |
| Язык | Python 3.11+ |
| Хранилище | SQLite (файл в репозитории не хранится) |
| Бюджет | ~0 ₸ инфраструктуры |
| Запуск | GitHub Actions по cron |
| Вывод | Telegram-бот + Google Sheet |
| Часовой пояс | Asia/Almaty (UTC+5) |

Почему GitHub Actions, а не cron на ноутбуке: работает при закрытом ноуте, бесплатно, секреты штатные, логи доступны с телефона.

---

## 3. Архитектура

```
┌──────────────┐
│   amoCRM     │  REST API v4, долгосрочный токен
└──────┬───────┘
       │  ① КОЛЛЕКТОР — инкрементально, по sync_state
       ▼
┌──────────────────────────────────────────┐
│  СЫРОЙ СЛОЙ (SQLite)                     │
│  raw_events · raw_notes · raw_leads      │
│  raw_tasks · raw_contacts · dim_*        │
│  Полный JSON сохраняется в колонке raw   │
└──────┬───────────────────────────────────┘
       │  ② ТРАНСФОРМ — чистый пересчёт, SQL
       ▼
┌──────────────────────────────────────────┐
│  ВИТРИНА                                 │
│  fact_calls · fact_leads · fact_moves    │
│  daily_metrics (1 строка = 1 день)       │
└──────┬───────────────────────────────────┘
       │  ③ ДОСТАВКА
       ├──► Telegram: утренний отчёт, /день /неделя /воронка
       └──► Google Sheet: витрина для ручных срезов
                     ▲
       ④ ЗАПУСК: GitHub Actions cron
```

**Почему сырой слой отделён от витрины.** Определения метрик будут меняться много раз («дозвон — это от 30 секунд или от 15?»). При отдельном сыром слое пересчёт занимает секунду. Если писать сразу агрегаты — каждое изменение требует повторной выкачки истории, а это упирается в лимиты API.

---

## 4. Модель данных в amoCRM — как всё устроено на самом деле

Ключевой раздел. Здесь три нюанса, на которых ломается большинство самописных решений.

### 4.1. Звонок — это примечание, а не сущность

Типы примечаний: `call_in` (входящий), `call_out` (исходящий).
Полезное лежит внутри `params`:

```json
{
  "uniq": "8f52d38a-...",
  "duration": 60,
  "source": "onlinePBX",
  "link": "https://...",
  "phone": "+7...",
  "call_responsible": 504141
}
```

Примечания привязываются к сущностям: `leads`, `contacts`, `companies`, `customers`.

### 4.2. ЛОВУШКА: фильтр по дате есть только у событий

| Метод | Фильтр по дате | Лимит | Отдаёт duration |
|---|---|---|---|
| `GET /api/v4/events` | `filter[created_at][from]` / `[to]` ✅ | 100 | ❌ только `note.id` |
| `GET /api/v4/{entity_type}/notes` | **только `filter[updated_at]`** ⚠️ | 250 | ✅ |

У списка примечаний **нет** фильтра по `created_at`. Поэтому «выгрузить звонки за вчера» одним запросом к `/notes` невозможно.

**Правильный алгоритм:**

```
events(filter[created_at][from..to], filter[type][]=outgoing_call,incoming_call)
   → из каждого события берём value_after[0].note.id и entity_id/entity_type
      → notes(filter[id][]=...) пачками до 250
         → duration, phone, link, uniq
```

### 4.3. ЛОВУШКА: звонки висят на контакте, а не на сделке

Запрос звонков по сделке не вернёт их, даже если в интерфейсе они видны в ленте сделки. Идти нужно через связанный контакт.

Следствие: чтобы посчитать «сколько звонков до закрытия сделки», нужна своя таблица связей `contact_id ↔ lead_id` (собирается из `/api/v4/contacts?with=leads`).

### 4.4. ЛОВУШКА: штатная аналитика amo может врать

Чтобы звонок корректно попал в раздел «Аналитика» по пользователю, у примечания `responsible_user_id` и `created_by` должны **совпадать**. Некоторые интеграции телефонии пишут их по-разному.

**Задача для Этапа 0:** проверить, совпадают ли эти поля в реальных данных. Если нет — зафиксировать в отчёте и считать «мои звонки» по тому полю, которое заполнено корректно.

### 4.5. Используемые методы

| Метод | Зачем | Ключевые параметры |
|---|---|---|
| `GET /api/v4/events` | ядро сбора | `filter[created_at][from/to]`, `filter[created_by][]`, `filter[type][]`, `filter[entity][]`, `limit` (max 100), `with=contact_name,lead_name` |
| `GET /api/v4/events/types` | справочник типов | `language_code=ru` |
| `GET /api/v4/{entity_type}/notes` | детали звонков | `filter[id][]`, `filter[note_type]`, `limit` (max 250) |
| `GET /api/v4/leads` | сделки | `filter[created_at]`, `filter[updated_at]`, `with=contacts` |
| `GET /api/v4/contacts` | контакты и связи | `with=leads` |
| `GET /api/v4/tasks` | задачи и встречи | `filter[updated_at]`, `filter[is_completed]` |
| `GET /api/v4/users` | справочник | — |
| `GET /api/v4/leads/pipelines` | воронки и этапы | — |

### 4.6. Нужные типы событий

`incoming_call`, `outgoing_call`, `lead_added`, `lead_status_changed`, `lead_deleted`,
`contact_added`, `task_added`, `task_completed`, `task_result_added`,
`incoming_chat_message`, `outgoing_chat_message`, `entity_responsible_changed`

Структура `value_after`:
- звонки, `lead_added`, примечания → `value_after[0].note.id`
- `lead_status_changed` → `value_after[0].lead_status.id` и `.pipeline_id` (есть и `value_before`)
- сообщения чатов → `value_after[0].message.id`

**Нюанс фильтрации чатов:** для `incoming_chat_message` / `outgoing_chat_message` фильтровать нужно по `filter[entity][]=contact`, но в ответе `entity_type` может быть `lead` или `customer`. Это известная особенность API, не баг кода.

### 4.7. Авторизация

Для личной интеграции полный OAuth-цикл не нужен: при создании интеграции в
`Настройки → Интеграции → Создать интеграцию` выдаётся секретный ключ и **долгосрочный токен**.

Что учесть:
- код авторизации живёт 20 минут;
- refresh-токен — около 3 месяцев;
- реализовать обновление токена и понятную ошибку при истечении (не молчаливый сбой);
- коды ответа: `401` — не авторизован, `402` — аккаунт не оплачен.

### 4.8. Лимиты

Точное значение лимита запросов уточнить в разделе документации «Ограничения и рекомендации» и **вынести в конфиг** (`REQUESTS_PER_SECOND`). Обязательно реализовать:
- троттлинг на стороне клиента;
- экспоненциальный retry на `429` и `5xx`;
- пагинацию по `_links.next`, а не по счётчику страниц.

---

## 5. Схема БД

### Сырой слой

```sql
raw_events(
  id TEXT PRIMARY KEY,          -- ULID от amoCRM
  type TEXT, entity_id INTEGER, entity_type TEXT,
  created_by INTEGER, created_at INTEGER,
  value_after TEXT, value_before TEXT,   -- JSON
  raw TEXT, fetched_at INTEGER
);

raw_notes(
  id INTEGER PRIMARY KEY,
  entity_type TEXT, entity_id INTEGER, note_type TEXT,
  created_by INTEGER, responsible_user_id INTEGER,
  created_at INTEGER, updated_at INTEGER,
  params TEXT, raw TEXT, fetched_at INTEGER
);

raw_leads(id INTEGER PRIMARY KEY, name TEXT, price INTEGER,
  status_id INTEGER, pipeline_id INTEGER, responsible_user_id INTEGER,
  created_at INTEGER, updated_at INTEGER, closed_at INTEGER,
  raw TEXT, fetched_at INTEGER);

raw_contacts(id INTEGER PRIMARY KEY, name TEXT, responsible_user_id INTEGER,
  created_at INTEGER, raw TEXT, fetched_at INTEGER);

raw_tasks(id INTEGER PRIMARY KEY, entity_id INTEGER, entity_type TEXT,
  task_type_id INTEGER, is_completed INTEGER, complete_till INTEGER,
  created_at INTEGER, raw TEXT, fetched_at INTEGER);

link_contact_lead(contact_id INTEGER, lead_id INTEGER,
  PRIMARY KEY (contact_id, lead_id));

dim_users(id INTEGER PRIMARY KEY, name TEXT);
dim_statuses(status_id INTEGER, pipeline_id INTEGER, name TEXT, sort INTEGER,
  PRIMARY KEY (status_id, pipeline_id));

sync_state(resource TEXT PRIMARY KEY, last_synced_at INTEGER, last_run_at INTEGER);
```

### Витрина

```sql
fact_calls(
  note_id INTEGER PRIMARY KEY,
  dt TEXT,                   -- YYYY-MM-DD по Asia/Almaty
  ts INTEGER,
  direction TEXT,            -- in | out
  user_id INTEGER,
  entity_type TEXT, entity_id INTEGER,
  contact_id INTEGER, lead_id INTEGER,
  phone TEXT, duration INTEGER,
  is_connected INTEGER,      -- duration >= CONNECT_THRESHOLD_SEC
  record_link TEXT
);

fact_leads(lead_id, dt_created, pipeline_id, status_id, price,
           responsible_user_id, first_call_ts, first_touch_minutes,
           is_won, is_lost, dt_closed);

fact_status_moves(event_id, lead_id, ts, dt,
                  status_from, status_to, pipeline_id);

daily_metrics(dt TEXT PRIMARY KEY, /* см. раздел 7 */);
```

---

## 6. Этап 0 — разведка (блокирующий)

**Файл:** `scripts/probe.py`. Ничего не пишет в БД, только печатает отчёт.

**Что делает:**
1. Проверяет авторизацию (`GET /api/v4/account`).
2. Тянет `GET /api/v4/events` за последние 30 дней.
3. Печатает:
   - количество событий по каждому `type`;
   - количество событий по `created_by` (с именами из `/users`);
   - для 20 случайных звонков — вытаскивает примечание и показывает: заполнен ли `duration`, есть ли `link`, каково `source`, **совпадают ли `created_by` и `responsible_user_id`**;
   - распределение `duration` (сколько нулевых, медиана, максимум);
   - список воронок и этапов.

**Выход = решение:**

| Что показала разведка | Что делаем |
|---|---|
| Есть `outgoing_call` с ненулевым `duration` | Идём дальше по плану |
| События звонков есть, но `duration` всегда 0 | Считаем только количество попыток; конверсию дозвона строить нельзя — сначала чинить телефонию |
| `outgoing_call` нет вообще | **СТОП.** Телефония не подключена — аналитику строить не из чего. Сначала подключение телефонии |
| `created_by ≠ responsible_user_id` | Зафиксировать в отчёте, выбрать корректное поле для «мои звонки» |

---

## 7. Метрики

Количество звонков — метрика активности, а не результата: её легко накрутить и по ней нельзя принять решение. Поэтому считаем сразу связку активность → конверсия → скорость.

### Активность (за день)
- `calls_total`, `calls_out`, `calls_in`
- `calls_connected` — `duration >= CONNECT_THRESHOLD_SEC` (по умолчанию **30**, вынести в конфиг)
- `talk_minutes` — сумма `duration` по дозвонам
- `unique_contacts` — уникальных `contact_id`
- `avg_call_duration` — медиана по дозвонам (не среднее: выбросы искажают)

### Воронка
- `leads_new` — событий `lead_added`
- `leads_by_source`
- `meetings_scheduled` / `meetings_done` — задачи типа «встреча»
- `deals_won`, `deals_lost`, `revenue_won`

### Конверсии
- `connect_rate` = `calls_connected / calls_out`
- `meeting_rate` = `meetings_scheduled / calls_connected`
- `close_rate` = `deals_won / meetings_done`

### Скорость и гигиена
- `first_touch_minutes` — медиана времени от `lead_added` до первого `outgoing_call`.
  Лучший предиктор конверсии в B2B — считать обязательно.
- `stale_leads` — сделки в работе без активности > `STALE_DAYS` (по умолчанию 7)
- `leads_without_task` — сделки в работе без открытой задачи

**Дисциплина метрик:** каждая метрика в коде сопровождается комментарием с точным определением. Если определение меняется — меняется комментарий и пересчитывается витрина целиком.

---

## 8. Этапы работ

### Этап 0. Разведка ⛔ блокирующий
- [ ] `scripts/probe.py` работает и печатает отчёт
- [ ] Решение по таблице раздела 6 принято и записано сюда

**DoD:** владелец увидел реальные цифры своего аккаунта и подтвердил, что данные есть.

### Этап 1. Коллектор и сырой слой
- [ ] `amo_client.py`: авторизация, троттлинг, retry, пагинация по `_links.next`
- [ ] Коллекторы: events → notes → leads → contacts → tasks → справочники
- [ ] Инкрементальность через `sync_state`
- [ ] Первичная выгрузка: последние 90 дней
- [ ] `--full-refresh` для полной перезаливки

**DoD:** `python -m src.sync` дважды подряд не создаёт дублей; число звонков в БД сходится с интерфейсом amoCRM за произвольный день.

### Этап 2. Витрина
- [ ] `marts.sql`: `fact_calls`, `fact_leads`, `fact_status_moves`, `daily_metrics`
- [ ] Связь контакт ↔ сделка
- [ ] Полный пересчёт витрины из сырого слоя одной командой

**DoD:** `daily_metrics` за вчера сверена с интерфейсом amoCRM вручную; расхождения объяснены.

### Этап 3. Доставка
- [ ] `reports/daily.py` — формирование текста сводки
- [ ] Telegram-бот: утренний отчёт + `/день`, `/неделя`, `/воронка`
- [ ] Выгрузка `daily_metrics` в Google Sheet

**DoD:** сводка пришла в Telegram, цифры в ней совпадают с БД.

### Этап 4. Автоматизация
- [ ] `.github/workflows/sync.yml` — cron
- [ ] Секреты в GitHub Secrets
- [ ] Уведомление в Telegram при падении задачи

**DoD:** три дня подряд отчёт приходит без ручного вмешательства.

**Проблема состояния:** GitHub Actions не хранит файлы между запусками. Варианты (выбрать на Этапе 4):
1. коммитить SQLite обратно в репозиторий — просто, но база публична, если репо публичный;
2. Turso / любая managed SQLite — бесплатный тариф, отдельный сервис;
3. хранить сырьё в приватном Gist или как artifact — костыль, но рабочий.

**Рекомендация: репозиторий делать приватным в любом случае** — в базе телефоны клиентов.

### Этап 5. Опционально
- [ ] LLM поверх витрины: вопросы к данным на естественном языке
- [ ] Быстрая альтернатива для проверки гипотезы: подключить готовый MCP-сервер amoCRM к Claude и «поговорить» с данными до написания своего кода

---

## 9. Структура репозитория

```
amo-analytics/
├── README.md
├── CLAUDE.md                 # правила из раздела 0 + команды запуска
├── docs/PLAN.md              # этот файл
├── .env.example
├── .gitignore                # *.db, .env — обязательно
├── requirements.txt
├── src/
│   ├── config.py
│   ├── amo_client.py
│   ├── sync.py
│   ├── collectors/{events,notes,leads,contacts,tasks,dicts}.py
│   ├── db/{schema.sql,marts.sql,load.py}
│   └── reports/{daily.py,telegram_bot.py,sheets.py}
├── scripts/probe.py
├── tests/
└── .github/workflows/sync.yml
```

### `.env.example`

```bash
AMO_SUBDOMAIN=xxx              # без .amocrm.ru
AMO_DOMAIN=amocrm.ru           # или amocrm.kz — уточнить
AMO_LONG_TOKEN=
AMO_MY_USER_ID=                # заполнить из probe.py

TIMEZONE=Asia/Almaty
CONNECT_THRESHOLD_SEC=30
STALE_DAYS=7
REQUESTS_PER_SECOND=           # уточнить в документации

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
GOOGLE_SHEET_ID=
```

---

## 10. Что дальше (вне рамок v1)

1. **WhatsApp-автоответы.** Скорее всего покупать, а не строить: готовые сервисы это закрывают. Развилка — личный номер против официального WABA. Своя разработка оправдана, только если нужен осмысленный ответ по контексту сделки, а не шаблон.
2. **Речевая аналитика записей звонков.** Расшифровка + извлечение квалификации + автозаполнение полей в amoCRM. Даёт большую часть пользы от «AI-квалификатора» при малой доле сложности и без репутационного риска. **Рекомендуемый следующий проект.**
3. **AI-квалификатор для обзвона (kk/ru).** Самое сложное и рискованное. Узкое место — распознавание казахского в реальном времени по телефонному каналу и переключение языков внутри реплики. Плюс вопрос, скажет ли собственник свой оборот роботу. Делать только после того, как п. 2 покажет реальные скрипты и цифры.

---

## 11. Открытые вопросы

- [ ] Домен аккаунта: `.amocrm.ru` или `.amocrm.kz`?
- [ ] Тариф amoCRM — доступен ли раздел «Создать интеграцию»?
- [ ] Какая телефония подключена и подключена ли вообще?
- [ ] Есть ли записи разговоров, где хранятся, какой срок?
- [ ] Сколько звонков в день фактически — от этого зависит объём первичной выгрузки
- [ ] Порог дозвона: 30 секунд подходит или свой?
- [ ] Инструмент только для себя или потом тиражировать?
- [ ] Какие воронки и этапы считать «встречей назначена» / «клиент пришёл»?

---

## Журнал изменений

| Дата | Версия | Что изменилось |
|---|---|---|
| 2026-08-12 | v0.1 | Первая версия: архитектура, модель данных, метрики, этапы |
