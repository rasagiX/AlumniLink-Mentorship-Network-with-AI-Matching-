from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AlumniLink API"
    API_V1_PREFIX: str = "/api/v1"

    SECRET_KEY: str = "dev-only-insecure-secret-change-me-before-deploying"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    DATABASE_URL: str = "postgresql+psycopg2://alumnilink:alumnilink_dev_pw@localhost:5432/alumnilink"

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
