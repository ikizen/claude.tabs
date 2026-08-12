#!/usr/bin/env python3
"""Этап 0 — разведка (docs/PLAN.md, раздел 6). Ничего не пишет в БД, только печатает отчёт.

Запуск: python -m scripts.probe
"""
import random
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, ".")

from src.amo_client import AmoApiError, AmoAuthError, AmoClient, AmoNotPaidError
from src.config import ConfigError, load_config

PROBE_WINDOW_DAYS = 30
SAMPLE_CALLS = 20
CALL_TYPES = ("incoming_call", "outgoing_call")
NOTES_BATCH_SIZE = 250


def check_auth(client: AmoClient) -> dict:
    account = client.get("/api/v4/account")
    print(f"✅ Авторизация ок: аккаунт «{account.get('name')}» (id={account.get('id')})")
    return account


def fetch_events(client: AmoClient, since: datetime, until: datetime) -> list[dict]:
    params = {
        "filter[created_at][from]": int(since.timestamp()),
        "filter[created_at][to]": int(until.timestamp()),
        "limit": 100,
    }
    events = list(client.paginate("/api/v4/events", params, embedded_key="events"))
    print(f"\nСобытий за последние {PROBE_WINDOW_DAYS} дней: {len(events)}")
    return events


def fetch_users(client: AmoClient) -> dict[int, str]:
    users = list(client.paginate("/api/v4/users", {"limit": 250}, embedded_key="users"))
    return {u["id"]: u.get("name", "?") for u in users}


def print_counts_by_type(events: list[dict]):
    counts = Counter(e.get("type") for e in events)
    print("\nСобытия по типу:")
    for event_type, count in counts.most_common():
        print(f"  {event_type:35s} {count}")


def print_counts_by_user(events: list[dict], users: dict[int, str]):
    counts = Counter(e.get("created_by") for e in events)
    print("\nСобытия по created_by:")
    for user_id, count in counts.most_common():
        name = users.get(user_id, "неизвестно")
        print(f"  {user_id} ({name}): {count}")


def fetch_call_notes(client: AmoClient, call_events: list[dict]) -> list[dict]:
    """Batches note lookups per entity_type, following the events -> notes algorithm in PLAN.md 4.2."""
    note_ids_by_entity: dict[str, set[int]] = defaultdict(set)
    for event in call_events:
        value_after = event.get("value_after") or []
        if not value_after or "note" not in value_after[0]:
            continue
        note_id = value_after[0]["note"]["id"]
        entity_type = event.get("entity_type")
        note_ids_by_entity[entity_type].add(note_id)

    notes = []
    for entity_type, note_ids in note_ids_by_entity.items():
        note_ids = list(note_ids)
        for i in range(0, len(note_ids), NOTES_BATCH_SIZE):
            batch = note_ids[i : i + NOTES_BATCH_SIZE]
            params = {"filter[id][]": batch, "limit": NOTES_BATCH_SIZE}
            notes.extend(
                client.paginate(f"/api/v4/{entity_type}/notes", params, embedded_key="notes")
            )
    return notes


def print_duration_distribution(notes: list[dict]):
    durations = [n.get("params", {}).get("duration", 0) or 0 for n in notes]
    zero_count = sum(1 for d in durations if d == 0)
    print(f"\nПримечаний-звонков с данными: {len(notes)}")
    if not durations:
        print("  Нет данных о duration.")
        return
    print(f"  duration == 0: {zero_count} ({zero_count / len(durations):.0%})")
    print(f"  медиана: {statistics.median(durations):.0f} сек")
    print(f"  максимум: {max(durations)} сек")


def print_responsible_mismatch(notes: list[dict]):
    mismatches = [
        n for n in notes if n.get("created_by") != n.get("responsible_user_id")
    ]
    print(
        f"\ncreated_by != responsible_user_id: {len(mismatches)} из {len(notes)} примечаний"
    )
    if mismatches:
        print("  ⚠️ Штатная аналитика amoCRM может недосчитывать эти звонки (см. PLAN.md 4.4).")


def print_sample(notes: list[dict], tz: ZoneInfo):
    sample = random.sample(notes, min(SAMPLE_CALLS, len(notes)))
    print(f"\nВыборка из {len(sample)} звонков:")
    for note in sample:
        params = note.get("params", {})
        created_at = note.get("created_at")
        dt = (
            datetime.fromtimestamp(created_at, tz=timezone.utc).astimezone(tz).isoformat()
            if created_at
            else "?"
        )
        match = "=" if note.get("created_by") == note.get("responsible_user_id") else "≠"
        print(
            f"  note_id={note.get('id')} {dt} type={note.get('note_type')} "
            f"duration={params.get('duration')} source={params.get('source')} "
            f"link={'да' if params.get('link') else 'нет'} "
            f"created_by{match}responsible_user_id "
            f"({note.get('created_by')} vs {note.get('responsible_user_id')})"
        )


def print_pipelines(client: AmoClient):
    payload = client.get("/api/v4/leads/pipelines")
    pipelines = payload.get("_embedded", {}).get("pipelines", [])
    print(f"\nВоронки ({len(pipelines)}):")
    for pipeline in pipelines:
        print(f"  [{pipeline['id']}] {pipeline['name']}")
        statuses = pipeline.get("_embedded", {}).get("statuses", [])
        for status in sorted(statuses, key=lambda s: s.get("sort", 0)):
            print(f"      [{status['id']}] {status['name']}")


def main():
    try:
        config = load_config()
    except ConfigError as e:
        print(f"❌ {e}")
        sys.exit(1)

    tz = ZoneInfo(config.timezone)
    client = AmoClient(config)

    try:
        check_auth(client)

        until = datetime.now(tz=timezone.utc)
        since = until - timedelta(days=PROBE_WINDOW_DAYS)
        events = fetch_events(client, since, until)

        print_counts_by_type(events)

        users = fetch_users(client)
        print_counts_by_user(events, users)

        call_events = [e for e in events if e.get("type") in CALL_TYPES]
        if not call_events:
            print(
                "\n🛑 СТОП: за 30 дней нет ни одного события incoming_call/outgoing_call. "
                "Телефония не подключена (или события не долетают) — аналитику строить не из чего. "
                "См. PLAN.md раздел 6, решение по таблице."
            )
            print_pipelines(client)
            return

        notes = fetch_call_notes(client, call_events)
        print_duration_distribution(notes)
        print_responsible_mismatch(notes)
        print_sample(notes, tz)
        print_pipelines(client)

    except AmoAuthError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except AmoNotPaidError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except AmoApiError as e:
        print(f"❌ Ошибка API amoCRM: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
