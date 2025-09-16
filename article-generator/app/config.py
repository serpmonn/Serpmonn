import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


def get_env_str(key: str, default: str) -> str:
    value = os.getenv(key, default)
    return value


def get_env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except ValueError:
        return default


def get_languages() -> List[str]:
    raw = os.getenv("LANGUAGES", "ru,en,zh")
    return [lang.strip() for lang in raw.split(",") if lang.strip()]


class Settings:
    provider_type: str
    languages: List[str]
    storage_dir: str
    generator_interval_seconds: int
    max_articles: int
    host: str
    port: int
    openai_api_key: str
    openai_model: str
    ollama_base_url: str
    ollama_model: str

    def __init__(self) -> None:
        self.provider_type = get_env_str("PROVIDER_TYPE", "mock")
        self.languages = get_languages()
        self.storage_dir = get_env_str("STORAGE_DIR", "/app/data")
        self.generator_interval_seconds = get_env_int("GENERATOR_INTERVAL_SECONDS", 900)
        self.max_articles = get_env_int("MAX_ARTICLES", 1000)
        self.host = get_env_str("HOST", "0.0.0.0")
        self.port = get_env_int("PORT", 8080)
        self.openai_api_key = get_env_str("OPENAI_API_KEY", "")
        self.openai_model = get_env_str("OPENAI_MODEL", "gpt-4o-mini")
        self.ollama_base_url = get_env_str("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = get_env_str("OLLAMA_MODEL", "llama3.1:8b")


settings = Settings()