# amo-analytics

Личная аналитика звонков и лидов из amoCRM: коллектор → SQLite → Telegram/Google Sheet.

Полный план и архитектура: [docs/PLAN.md](docs/PLAN.md).

## Статус

⛔ **Этап 0 (разведка) ещё не пройден.** Коллектор, схема БД и отчёты по плану
намеренно не пишутся, пока `scripts/probe.py` не подтвердит на реальных данных
аккаунта, что звонки долетают в amoCRM с ненулевым `duration` (см. `docs/PLAN.md`,
разделы 0 и 6).

## Быстрый старт (Этап 0)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# заполнить AMO_SUBDOMAIN, AMO_DOMAIN, AMO_LONG_TOKEN

python -m scripts.probe
```

Скрипт ничего не пишет в БД — только печатает отчёт по реальным данным аккаунта.
По результату принимается решение из таблицы в `docs/PLAN.md` (раздел 6).
