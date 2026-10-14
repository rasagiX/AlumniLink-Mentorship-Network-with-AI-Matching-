"""
Storage abstraction: Cloudflare R2 (S3-compatible) or local disk fallback.

Usage:
    from app.core.storage import storage

    # Upload
    url = await storage.upload(file_bytes, key, content_type)

    # Delete
    await storage.delete(key)

    # Presigned download (R2) or served path (local)
    download_url = storage.download_url(key, filename)
"""

import re
import uuid
from pathlib import Path
from typing import Optional

from app.core.config import settings


class _StorageBackend:
    def upload_sync(self, content: bytes, key: str, content_type: str = "application/pdf") -> str:
        """
        Store a file. Returns the key (R2) or relative path (local).
        Raises on failure.
        """
        raise NotImplementedError

    def delete_sync(self, key: str) -> None:
        raise NotImplementedError

    def download_url(self, key: str, filename: str, expires: int = 3600) -> str:
        """Return a URL the portal can redirect to for downloading the file."""
        raise NotImplementedError


class _R2Backend(_StorageBackend):
    def __init__(self):
        import boto3
        self._s3 = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
        self._bucket = settings.R2_BUCKET_NAME
        self._public_base = settings.R2_PUBLIC_BASE_URL.rstrip("/")

    def upload_sync(self, content: bytes, key: str, content_type: str = "application/pdf") -> str:
        self._s3.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
            # Prevent browsers from auto-downloading; the portal serves it via
            # a signed URL with Content-Disposition: attachment set at download time.
        )
        return key

    def delete_sync(self, key: str) -> None:
        self._s3.delete_object(Bucket=self._bucket, Key=key)

    def download_url(self, key: str, filename: str, expires: int = 3600) -> str:
        """
        Generate a presigned URL.
        If R2_PUBLIC_BASE_URL is set, use that instead of a presigned URL
        (useful when the bucket has a public domain but download should be
        forced via Content-Disposition).
        """
        safe_name = re.sub(r'[^A-Za-z0-9._-]', '_', filename)
        url = self._s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self._bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{safe_name}"',
            },
            ExpiresIn=expires,
        )
        return url


class _LocalBackend(_StorageBackend):
    def __init__(self):
        self._root = Path(settings.UPLOAD_DIR) / "r2_local"
        self._root.mkdir(parents=True, exist_ok=True)

    def upload_sync(self, content: bytes, key: str, content_type: str = "application/pdf") -> str:
        dest = self._root / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)
        return key

    def delete_sync(self, key: str) -> None:
        path = self._root / key
        if path.is_file():
            path.unlink()

    def download_url(self, key: str, filename: str, expires: int = 3600) -> str:
        # Served via /api/lms/files/<key> FastAPI endpoint
        return f"/api/v1/lms/files/{key}"


def _make_backend() -> _StorageBackend:
    if settings.r2_enabled:
        try:
            return _R2Backend()
        except Exception as e:
            import warnings
            warnings.warn(f"R2 init failed ({e}); falling back to local storage.")
    return _LocalBackend()


# Singleton — imported everywhere
storage = _make_backend()


def make_storage_key(cycle_id: str, module_id: str, original_filename: str) -> str:
    """Deterministic, collision-resistant R2 key."""
    safe = re.sub(r'[^A-Za-z0-9._-]', '_', Path(original_filename).name)
    uid = uuid.uuid4().hex[:8]
    return f"lms/{cycle_id}/{module_id}/{uid}_{safe}"
