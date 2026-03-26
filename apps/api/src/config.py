from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 4000
    APP_URL: str
    AUTH_SECRET: str = Field(min_length=16)
    AUTH_URL: str = ""
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
