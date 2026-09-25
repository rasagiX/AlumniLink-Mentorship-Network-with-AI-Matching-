from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.db.base import Base  # noqa: F401 — registers all models on Base.metadata
from app.db.session import engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

# Allows the Next.js frontend (running on :3000) to call this API directly
# from the browser during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {"status": "ok", "service": settings.PROJECT_NAME}
