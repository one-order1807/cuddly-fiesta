from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str | None = None

    vault_key: str = ""
    allowed_origins: str = "http://localhost:3000"
    github_token: str | None = None
    backup_webhook_secret: str | None = None
    site_revalidate_url: str | None = None
    revalidate_secret: str | None = None
    enable_scheduler: bool = True

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
