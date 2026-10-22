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
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_BASE_URL: str = ""

    # ── WebRTC video classes ───────────────────────────────────────────────
    # Seconds a signaling ticket stays valid. Browser fetches one right
    # before opening the WebSocket, so this only needs to cover that gap.
    VIDEO_TICKET_TTL_SECONDS: int = 60
    # STUN is enough for local testing. Production NEEDS a TURN server too —
    # without it, users behind strict NATs / campus firewalls cannot connect.
    # List-valued settings are JSON in .env:
    #   STUN_URLS=["stun:stun.l.google.com:19302"]
    #   TURN_URLS=["turn:turn.example.com:3478"]
    STUN_URLS: list[str] = ["stun:stun.l.google.com:19302"]
    TURN_URLS: list[str] = []
    # Option A: static username + credential
    TURN_USERNAME: str = ""
    TURN_CREDENTIAL: str = ""
    # Option B (preferred — coturn `use-auth-secret`): HMAC-SHA1 short-lived
    # credentials derived per user. Takes priority over option A.
    TURN_SHARED_SECRET: str = ""
    TURN_CREDENTIAL_TTL_SECONDS: int = 6 * 60 * 60   # 6 hours

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
