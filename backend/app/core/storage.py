"""
Storage abstraction with three backends (highest priority first):

  1. Supabase Storage  — free 1 GB, no billing required.
                         Set SUPABASE_URL + SUPABASE_SERVICE_KEY + SUPABASE_BUCKET.

  2. Cloudflare R2     — free 10 GB, requires billing info.
                         Set R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
                         + R2_BUCKET_NAME.

  3. Local disk        — always available; files live in UPLOAD_DIR/r2_local/.
                         Fine for development; not suitable for multi-machine deploy.

Usage (all backends share the same interface):
    from app.core.storage import storage

    key  = storage.upload_sync(file_bytes, key, content_type)
    url  = storage.download_url(key, filename)
    storage.delete_sync(key)
"""

from __future__ import annotations

import re
import uuid
import warnings
from pathlib import Path
from typing import Optional

import requests

from app.core.config import settings


# ─────────────────────────────────────────────────────────────────────────────
# Abstract base
# ─────────────────────────────────────────────────────────────────────────────

class _StorageBackend:
    def upload_sync(self, content: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        raise NotImplementedError

    def delete_sync(self, key: str) -> None:
        raise NotImplementedError

    def download_url(self, key: str, filename: str, expires: int = 3600) -> str:
        raise NotImplementedError


# ─────────────────────────────────────────────────────────────────────────────
# Backend 1 — Supabase Storage (free tier, REST API, no SDK needed)
# ─────────────────────────────────────────────────────────────────────────────

class _SupabaseStorageBackend(_StorageBackend):
    """
    Uses Supabase Storage REST API directly.
    No boto3 / S3 SDK required — just the `requests` library.

    Docs: https://supabase.com/docs/guides/storage/api
    """

    def __init__(self) -> None:
        self._base   = settings.SUPABASE_URL.rstrip("/")
        self._bucket = settings.SUPABASE_BUCKET
        self._headers = {
            "apikey":        settings.SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        }

    def _object_url(self, key: str) -> str:
        return f"{self._base}/storage/v1/object/{self._bucket}/{key}"

    def upload_sync(self, content: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        resp = requests.post(
            self._object_url(key),
            data=content,
            headers={
                **self._headers,
                "Content-Type": content_type,
                "x-upsert": "true",   # overwrite if key already exists
            },
            timeout=120,
        )
        if not resp.ok:
            raise RuntimeError(
                f"Supabase Storage upload failed ({resp.status_code}): {resp.text}"
            )
        return key

    def delete_sync(self, key: str) -> None:
        resp = requests.delete(
            self._object_url(key),
            headers=self._headers,
            timeout=30,
        )
        # 404 is fine — already gone
        if not resp.ok and resp.status_code != 404:
            raise RuntimeError(
                f"Supabase Storage delete failed ({resp.status_code}): {resp.text}"
            )

    def download_url(self, key: str, filename: str, expires: int = 3600) -> str:
        """
        Returns a signed URL that expires after `expires` seconds.
        The browser will download the file with the original filename.
        """
        resp = requests.post(
            f"{self._base}/storage/v1/object/sign/{self._bucket}/{key}",
            json={"expiresIn": expires},
            headers={**self._headers, "Content-Type": "application/json"},
            timeout=15,
        )
        if resp.ok:
            signed = resp.json().get("signedURL") or resp.json().get("signedUrl", "")
            if signed:
                # signed URLs from Supabase are relative paths — make absolute
                if signed.startswith("/"):
                    signed = f"{self._base}{signed}"
                return signed
        # Fallback: public URL (works if bucket is set to public)
        return f"{self._base}/storage/v1/object/public/{self._bucket}/{key}"


# ─────────────────────────────────────────────────────────────────────────────
# Backend 2 — Cloudflare R2 (S3-compatible, requires billing info)
# ─────────────────────────────────────────────────────────────────────────────

class _R2Backend(_StorageBackend):
    def __init__(self) -> None:
        import boto3
        self._s3 = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
        self._bucket      = settings.R2_BUCKET_NAME
        self._public_base = settings.R2_PUBLIC_BASE_URL.rstrip("/")

    def upload_sync(self, content: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        self._s3.put_object(
            Bucket=self._bucket, Key=key, Body=content, ContentType=content_type
        )
        return key

    def delete_sync(self, key: str) -> None:
        self._s3.delete_object(Bucket=self._bucket, Key=key)

    def download_url(self, key: str, filename: str, expires: int = 3600) -> str:
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", filename)
        return self._s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self._bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{safe}"',
            },
            ExpiresIn=expires,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Backend 3 — Local disk fallback
# ─────────────────────────────────────────────────────────────────────────────

class _LocalBackend(_StorageBackend):
    def __init__(self) -> None:
        self._root = Path(settings.UPLOAD_DIR) / "r2_local"
        self._root.mkdir(parents=True, exist_ok=True)

    def upload_sync(self, content: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        dest = self._root / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)
        return key

    def delete_sync(self, key: str) -> None:
        path = self._root / key
        if path.is_file():
            path.unlink()

    def download_url(self, key: str, filename: str, expires: int = 3600) -> str:
        # Served via GET /api/v1/lms/files/<key>
        return f"/api/v1/lms/files/{key}"


# ─────────────────────────────────────────────────────────────────────────────
# Factory — picks the best available backend at startup
# ─────────────────────────────────────────────────────────────────────────────

def _make_backend() -> _StorageBackend:
    # 1. Try Supabase Storage first (free, no billing)
    if settings.supabase_storage_enabled:
        try:
            backend = _SupabaseStorageBackend()
            # Quick connectivity check — list bucket root
            resp = requests.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/bucket/{settings.SUPABASE_BUCKET}",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                },
                timeout=5,
            )
            if resp.ok or resp.status_code == 404:
                # 404 means bucket doesn't exist yet — create it automatically
                if resp.status_code == 404:
                    create_resp = requests.post(
                        f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/bucket",
                        json={"id": settings.SUPABASE_BUCKET, "name": settings.SUPABASE_BUCKET, "public": False},
                        headers={
                            "apikey": settings.SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                            "Content-Type": "application/json",
                        },
                        timeout=10,
                    )
                    if create_resp.ok:
                        print(f"[storage] Created Supabase bucket '{settings.SUPABASE_BUCKET}'")
                    else:
                        # Might already exist under a different error
                        pass
                print(f"[storage] Using Supabase Storage (bucket: {settings.SUPABASE_BUCKET})")
                return backend
        except Exception as exc:
            warnings.warn(f"[storage] Supabase Storage init failed ({exc}); trying next backend.")

    # 2. Try Cloudflare R2
    if settings.r2_enabled:
        try:
            backend = _R2Backend()
            print("[storage] Using Cloudflare R2")
            return backend
        except Exception as exc:
            warnings.warn(f"[storage] R2 init failed ({exc}); falling back to local storage.")

    # 3. Local disk
    print("[storage] Using local disk storage (uploads/r2_local/)")
    return _LocalBackend()


# Singleton imported everywhere
storage = _make_backend()


# ─────────────────────────────────────────────────────────────────────────────
# Key helpers (unchanged — used by LMS and recording upload endpoints)
# ─────────────────────────────────────────────────────────────────────────────

def make_storage_key(cycle_id: str, module_id: str, original_filename: str) -> str:
    """Collision-resistant key for LMS module file uploads."""
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", Path(original_filename).name)
    uid  = uuid.uuid4().hex[:8]
    return f"lms/{cycle_id}/{module_id}/{uid}_{safe}"
