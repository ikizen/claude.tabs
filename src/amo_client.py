"""Thin amoCRM REST API v4 client: auth, throttling, retry, cursor pagination.

Only wraps the endpoints listed in docs/PLAN.md section 4.5 — do not add
endpoints here speculatively.
"""
import time

import requests

from src.config import Config


class AmoAuthError(RuntimeError):
    """401 — токен недействителен или истёк."""


class AmoNotPaidError(RuntimeError):
    """402 — аккаунт не оплачен."""


class AmoApiError(RuntimeError):
    pass


class AmoClient:
    def __init__(self, config: Config):
        self._config = config
        self._session = requests.Session()
        self._session.headers["Authorization"] = f"Bearer {config.amo_long_token}"
        self._min_interval = 1.0 / config.requests_per_second
        self._last_request_at = 0.0

    def _throttle(self):
        elapsed = time.monotonic() - self._last_request_at
        wait = self._min_interval - elapsed
        if wait > 0:
            time.sleep(wait)

    def get(self, path: str, params: dict | None = None, max_retries: int = 5) -> dict:
        url = path if path.startswith("http") else f"{self._config.amo_base_url}{path}"
        backoff = 2.0
        for attempt in range(max_retries + 1):
            self._throttle()
            response = self._session.get(url, params=params, timeout=30)
            self._last_request_at = time.monotonic()

            if response.status_code == 401:
                raise AmoAuthError(
                    "amoCRM вернул 401: долгосрочный токен недействителен или истёк. "
                    "Проверьте AMO_LONG_TOKEN."
                )
            if response.status_code == 402:
                raise AmoNotPaidError("amoCRM вернул 402: аккаунт не оплачен.")
            if response.status_code == 204:
                return {}
            if response.status_code == 429 or response.status_code >= 500:
                if attempt == max_retries:
                    raise AmoApiError(
                        f"{response.status_code} от amoCRM после {max_retries} повторов: {url}"
                    )
                time.sleep(backoff)
                backoff *= 2
                continue
            if not response.ok:
                raise AmoApiError(f"{response.status_code} от amoCRM: {url} — {response.text[:500]}")
            return response.json()

        raise AmoApiError(f"Не удалось получить ответ от {url}")

    def paginate(self, path: str, params: dict | None = None, embedded_key: str | None = None):
        """Yields items across pages, following _links.next instead of counting pages."""
        next_url = path
        next_params = dict(params or {})
        while next_url:
            payload = self.get(next_url, next_params)
            embedded = payload.get("_embedded", {})
            key = embedded_key or (next(iter(embedded), None))
            for item in embedded.get(key, []) if key else []:
                yield item

            next_link = payload.get("_links", {}).get("next", {}).get("href")
            next_url = next_link
            next_params = None  # query is already encoded into next_link
