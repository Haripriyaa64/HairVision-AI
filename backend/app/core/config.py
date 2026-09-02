from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "HairVision AI"
    app_env: str = "development"
    debug: bool = True

    backend_host: str = "127.0.0.1"
    backend_port: int = 8000

    cors_origins: str = "http://localhost:3000"

    database_url: str = (
        "postgresql+psycopg://hairvision:"
        "hairvision_dev_password@localhost:5432/hairvision"
    )

    storage_provider: str = "local"
    upload_dir: str = "uploads"

    model_dir: str = "models/production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()