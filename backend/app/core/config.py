"""Application configuration management."""

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from pydantic import PostgresDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Get the base directory (backend/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    """Application settings and configuration.

    Settings are loaded from environment variables with fallback to .env file.
    """

    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Inventory Management System"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Production-ready inventory management system with AI forecasting"

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS Settings
    # BACKEND_CORS_ORIGINS can be used as an explicit override for all environments.
    BACKEND_CORS_ORIGINS: list[str] = []
    BACKEND_CORS_ORIGINS_DEV: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "http://localhost:5180",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "http://127.0.0.1:5179",
        "http://127.0.0.1:5180",
    ]
    BACKEND_CORS_ORIGINS_PROD: list[str] = []
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: list[str] = ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"]
    CORS_EXPOSE_HEADERS: list[str] = ["Content-Disposition"]

    # Security Settings
    SECRET_KEY: str = "dev-only-secret-key-change-before-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ISSUER: Optional[str] = None
    JWT_AUDIENCE: Optional[str] = None

    # Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int = 5432
    DATABASE_URI: Optional[PostgresDsn] = None

    # Redis Settings (for caching and background tasks)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Email Settings (for notifications)
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None

    # Super Admin Settings
    FIRST_SUPERUSER_EMAIL: str = "admin@inventory.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT_REQUESTS: int = 60
    RATE_LIMIT_DEFAULT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_AUTH_LOGIN_REQUESTS: int = 20
    RATE_LIMIT_AUTH_LOGIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_AUTH_REFRESH_REQUESTS: int = 10
    RATE_LIMIT_AUTH_REFRESH_WINDOW_SECONDS: int = 60
    RATE_LIMIT_AI_REQUESTS: int = 20
    RATE_LIMIT_AI_WINDOW_SECONDS: int = 60
    RATE_LIMIT_ALERTS_REQUESTS: int = 20
    RATE_LIMIT_ALERTS_WINDOW_SECONDS: int = 60
    # Backward-compatible alias (deprecated)
    RATE_LIMIT_PER_MINUTE: Optional[int] = None

    # Host/proxy hardening
    TRUSTED_HOSTS: list[str] = ["localhost", "127.0.0.1", "testserver"]
    ENABLE_PROXY_HEADERS: bool = False
    FORWARDED_ALLOW_IPS: str = "127.0.0.1"

    # File Upload
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024
    UPLOAD_DIR: str = "uploads"

    # AI/ML Settings
    AI_MODEL_PATH: str = "models/"
    FORECAST_DAYS: int = 30

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
        env_prefix="",
    )

    @field_validator(
        "BACKEND_CORS_ORIGINS",
        "BACKEND_CORS_ORIGINS_DEV",
        "BACKEND_CORS_ORIGINS_PROD",
        "CORS_ALLOW_METHODS",
        "CORS_ALLOW_HEADERS",
        "CORS_EXPOSE_HEADERS",
        "TRUSTED_HOSTS",
        mode="before",
    )
    @classmethod
    def parse_string_list(cls, v: Any) -> list[str]:
        """Parse list settings from JSON, CSV, or Python list inputs."""
        if isinstance(v, list):
            return v

        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                return []

            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return parsed
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON list value: %s", stripped)

            return [item.strip() for item in stripped.split(",") if item.strip()]

        return []

    @field_validator("DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info) -> Any:
        """Assemble database URI from individual components."""
        if isinstance(v, str):
            return v

        values = info.data
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            port=values.get("POSTGRES_PORT"),
            path=f"{values.get('POSTGRES_DB') or ''}",
        )

    @property
    def cors_origins(self) -> list[str]:
        """Resolve CORS origins with environment-aware precedence."""
        if self.BACKEND_CORS_ORIGINS:
            origins = self.BACKEND_CORS_ORIGINS
        elif self.ENVIRONMENT == "production":
            origins = self.BACKEND_CORS_ORIGINS_PROD
        else:
            origins = self.BACKEND_CORS_ORIGINS_DEV

        return list(dict.fromkeys(origins))

    @model_validator(mode="after")
    def validate_critical_settings(self) -> "Settings":
        """Validate critical settings and production safety constraints."""
        if self.RATE_LIMIT_PER_MINUTE is not None and self.RATE_LIMIT_PER_MINUTE > 0:
            self.RATE_LIMIT_DEFAULT_REQUESTS = self.RATE_LIMIT_PER_MINUTE

        if self.CORS_ALLOW_CREDENTIALS and any(origin == "*" for origin in self.cors_origins):
            raise ValueError("Credentialed CORS cannot use wildcard '*' origins")

        if self.ENVIRONMENT == "production":
            weak_secret_markers = {
                "dev-only-secret-key-change-before-production",
                "change-this-to-a-long-random-string",
                "your-secret-key-change-in-production",
                "secret",
                "changeme",
            }
            if self.SECRET_KEY in weak_secret_markers or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be a strong random value (>=32 chars) in production")

            if self.DEBUG:
                raise ValueError("DEBUG must be False in production")

            if not self.cors_origins:
                raise ValueError("Set BACKEND_CORS_ORIGINS_PROD (or BACKEND_CORS_ORIGINS) in production")

            if any(origin == "*" for origin in self.cors_origins):
                raise ValueError("Wildcard CORS origins are not allowed in production")

            if not self.TRUSTED_HOSTS:
                raise ValueError("TRUSTED_HOSTS must be set in production")

            if any(host == "*" for host in self.TRUSTED_HOSTS):
                raise ValueError("Wildcard TRUSTED_HOSTS are not allowed in production")

            if self.POSTGRES_PASSWORD in {"postgres", "password", "admin", ""}:
                raise ValueError("POSTGRES_PASSWORD must be changed from weak defaults in production")

            if self.FIRST_SUPERUSER_PASSWORD in {"admin123", "password", "admin"}:
                raise ValueError("FIRST_SUPERUSER_PASSWORD must be changed in production")

        if self.POSTGRES_PASSWORD in ["postgres", "password", "admin", ""]:
            logger.warning("Using weak database password in %s mode", self.ENVIRONMENT)

        return self


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    abs_env_path = str(ENV_FILE.resolve())
    if ENV_FILE.exists():
        logger.info("Loading .env from: %s", abs_env_path)
    else:
        logger.warning(".env file not found at: %s", abs_env_path)
        logger.warning("Using environment variables or defaults")

    try:
        settings_obj = Settings()
        logger.info("Configuration loaded successfully (Environment: %s)", settings_obj.ENVIRONMENT)

        masked_url = re.sub(r"://([^:]+):([^@]+)@", r"://\\1:****@", str(settings_obj.DATABASE_URI))
        logger.info(
            "Database: postgresql+asyncpg://%s:****@%s:%s/%s",
            settings_obj.POSTGRES_USER,
            settings_obj.POSTGRES_SERVER,
            settings_obj.POSTGRES_PORT,
            settings_obj.POSTGRES_DB,
        )
        logger.info("SQLAlchemy URI (masked): %s", masked_url)

        return settings_obj
    except Exception as exc:
        logger.error("Failed to load configuration: %s", exc)
        raise


settings = get_settings()
