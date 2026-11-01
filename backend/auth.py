"""Password hashing and a small signed cookie session using Python's standard library."""
import base64
import hashlib
import hmac
import os
import time
from collections import defaultdict

from fastapi import HTTPException, Request

COOKIE_NAME = "ruatoan_basic_session"
ITERATIONS = 200_000

# In-memory per-instance login throttle (standard serverless instance).
_LOGIN_WINDOW = 15 * 60
_LOGIN_MAX_FAILURES = 5
_login_failures: dict[str, list[float]] = defaultdict(list)


def secret():
    value = os.getenv("SESSION_SECRET", "")
    if len(value) < 24:
        raise RuntimeError("Set SESSION_SECRET to a random value of at least 24 characters.")
    return value.encode()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${digest.hex()}"


def _check_legacy(password: str, saved: str) -> bool:
    # Old format 1: pure hex salt(16 bytes) + hash(32 bytes), 200000 iterations.
    try:
        raw = bytes.fromhex(saved)
        if len(raw) == 48:
            salt, old_hash = raw[:16], raw[16:]
            new_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
            return hmac.compare_digest(new_hash, old_hash)
    except (ValueError, TypeError):
        pass
    # Old format 2: base64(salt(16) + hash(32)).
    try:
        raw = base64.urlsafe_b64decode(saved.encode())
        if len(raw) == 48:
            salt, old_hash = raw[:16], raw[16:]
            new_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
            return hmac.compare_digest(new_hash, old_hash)
    except Exception:
        return False
    return False


def check_password(password: str, saved: str) -> bool:
    if not saved:
        return False
    if saved.startswith("pbkdf2_sha256$"):
        parts = saved.split("$")
        if len(parts) != 4:
            return False
        try:
            iterations = int(parts[1])
            salt = bytes.fromhex(parts[2])
            expected = bytes.fromhex(parts[3])
            digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
            return hmac.compare_digest(digest, expected)
        except (ValueError, TypeError):
            return False
    return _check_legacy(password, saved)


def make_cookie(user_id: int) -> str:
    body = f"{user_id}:{int(time.time()) + 60 * 60 * 24 * 14}"
    signature = hmac.new(secret(), body.encode(), hashlib.sha256).hexdigest()
    return body + "." + signature


def read_user_id(request: Request):
    value = request.cookies.get(COOKIE_NAME, "")
    try:
        body, signature = value.rsplit(".", 1)
        expected = hmac.new(secret(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        user_id, expiry = body.split(":", 1)
        if int(expiry) < int(time.time()):
            return None
        return int(user_id)
    except Exception:
        return None


def require_user(request: Request):
    user_id = read_user_id(request)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Bạn cần đăng nhập trước.")
    return user_id


def _prune(email: str, now: float):
    items = [ts for ts in _login_failures.get(email, []) if now - ts < _LOGIN_WINDOW]
    _login_failures[email] = items
    return items


def login_blocked(email: str) -> bool:
    now = time.time()
    items = _prune(email, now)
    return len(items) >= _LOGIN_MAX_FAILURES


def record_login_failure(email: str):
    now = time.time()
    items = _prune(email, now)
    items.append(now)
    _login_failures[email] = items


def clear_login_failures(email: str):
    _login_failures.pop(email, None)
