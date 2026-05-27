from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    web_origin: str = "http://localhost:3000"
    session_ttl_minutes: int = 30
    exec_timeout_seconds: int = 10
    max_upload_bytes: int = 5 * 1024 * 1024
    max_active_workers: int = 18
    max_concurrent_executions: int = 6

    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = base_dir / "data"
    uploads_dir: Path = base_dir / "uploads"
    classipynb_dir: Path = base_dir / "classipynb"

    allowed_dataset_prefixes: tuple[str, ...] = ("data/", "uploads/")


settings = Settings()
settings.uploads_dir.mkdir(parents=True, exist_ok=True)
