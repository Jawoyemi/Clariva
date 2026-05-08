from pathlib import Path
from urllib.parse import quote
import shutil

import boto3
from botocore.client import Config

from app.config import settings


def _using_r2() -> bool:
    return (
        settings.DOC_STORAGE_BACKEND.lower() == "r2"
        and settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET_NAME
    )


def _r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_file(local_path: str, storage_key: str, content_type: str) -> str:
    if _using_r2():
        _r2_client().upload_file(
            Filename=local_path,
            Bucket=settings.R2_BUCKET_NAME,
            Key=storage_key,
            ExtraArgs={"ContentType": content_type},
        )
        return storage_key

    target = Path(settings.LOCAL_STORAGE_DIR) / storage_key
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(local_path, target)
    return str(target)


def delete_file(storage_key: str) -> None:
    if not storage_key:
        return

    if _using_r2():
        _r2_client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=storage_key)
        return

    path = Path(storage_key)
    if not path.is_absolute():
        path = Path(settings.LOCAL_STORAGE_DIR) / storage_key
    if path.exists():
        path.unlink()


def get_download_url(storage_key: str, expires_in: int = 900) -> str:
    if _using_r2():
        if settings.R2_PUBLIC_BASE_URL:
            return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{quote(storage_key)}"

        return _r2_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET_NAME, "Key": storage_key},
            ExpiresIn=expires_in,
        )

    path = Path(storage_key)
    if not path.is_absolute():
        path = Path(settings.LOCAL_STORAGE_DIR) / storage_key
    normalized_path = str(path).replace("\\", "/")
    return f"/documents/files/{quote(normalized_path)}"
