"""Central config. All thresholds and secrets are read from the environment — see .env.example."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    pass


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(
            f"Отсутствует обязательная переменная окружения {name}. "
            f"Заполните её в .env (см. .env.example)."
        )
    return value


@dataclass(frozen=True)
class Config:
    amo_subdomain: str
    amo_domain: str
    amo_long_token: str
    timezone: str
    connect_threshold_sec: int
    stale_days: int
    requests_per_second: float

    @property
    def amo_base_url(self) -> str:
        return f"https://{self.amo_subdomain}.{self.amo_domain}"


def load_config() -> Config:
    return Config(
        amo_subdomain=_required("AMO_SUBDOMAIN"),
        amo_domain=os.environ.get("AMO_DOMAIN", "amocrm.ru").strip(),
        amo_long_token=_required("AMO_LONG_TOKEN"),
        timezone=os.environ.get("TIMEZONE", "Asia/Almaty").strip(),
        connect_threshold_sec=int(os.environ.get("CONNECT_THRESHOLD_SEC", "30")),
        stale_days=int(os.environ.get("STALE_DAYS", "7")),
        requests_per_second=float(os.environ.get("REQUESTS_PER_SECOND", "7")),
    )
