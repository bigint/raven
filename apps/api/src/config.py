from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings

# Resolve root .env (two levels up from apps/api/)
_root = Path(__file__).resolve().parent.parent.parent.parent
_env_file = _root / ".env"


class Settings(BaseSettings):
    model_config = {
        "env_file": str(_env_file) if _env_file.exists() else ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 4000
    APP_URL: str
    AUTH_SECRET: str = Field(default="", alias="BETTER_AUTH_SECRET")
    AUTH_URL: str = Field(default="", alias="BETTER_AUTH_URL")
    DATABASE_URL: str
    ENCRYPTION_SECRET: str = Field(min_length=32)
    ENCRYPTION_SECRET_PREVIOUS: str | None = None
    NEXT_PUBLIC_API_URL: str = ""
    ENV: str = Field(default="development", alias="NODE_ENV")
    REDIS_URL: str

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def database_url_async(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def database_url_sync(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
