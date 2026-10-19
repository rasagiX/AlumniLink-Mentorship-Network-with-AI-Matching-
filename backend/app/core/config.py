from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AlumniLink API"
    API_V1_PREFIX: str = "/api/v1"

    SECRET_KEY: str = "dev-only-insecure-secret-change-me-before-deploying"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    DATABASE_URL: str = "postgresql+psycopg2://alumnilink:alumnilink_dev_pw@localhost:5432/alumnilink"

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    UPLOAD_DIR: str = "uploads"

    # ── Cloudflare R2 ─────────────────────────────────────────────────────
    # Set these in .env to enable R2. If blank, the app falls back to
    # local disk storage (UPLOAD_DIR) so development works without credentials.
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    # Public-access custom domain, e.g. https://files.yourschool.edu
    # Used only for download URLs when R2 is enabled.
    R2_PUBLIC_BASE_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def r2_enabled(self) -> bool:
        return bool(
            self.R2_ACCOUNT_ID
            and self.R2_ACCESS_KEY_ID
            and self.R2_SECRET_ACCESS_KEY
            and self.R2_BUCKET_NAME
        )

    @property
    def r2_endpoint_url(self) -> str:
        return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


settings = Settings()
