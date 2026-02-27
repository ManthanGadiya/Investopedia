from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import secrets


SESSION_DAYS = 7


def hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def generate_access_token() -> str:
    return secrets.token_urlsafe(32)


def token_expiry() -> datetime:
    return datetime.now() + timedelta(days=SESSION_DAYS)
