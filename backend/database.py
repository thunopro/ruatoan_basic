"""Small database helper. PostgreSQL keeps accounts and uploaded photos."""
import os

from psycopg import errors as psycopg_errors
from psycopg import sql
from psycopg.rows import dict_row

# psycopg_pool is required for serverless connection reuse. If it is missing
# we fail loudly instead of silently opening a fresh connection per call
# (which would exhaust Postgres connections on serverless platforms).
try:
    from psycopg_pool import ConnectionPool
except Exception:  # pragma: no cover - dependency check
    ConnectionPool = None  # type: ignore[assignment,misc]

_POOL_MISSING_MSG = "psycopg_pool is not installed. Install it with: pip install psycopg-pool"

SCHEMA = "ruatoan_basic"


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is missing. Copy .env.example to .env.local and add a PostgreSQL URL."
        )
    return url


_pool = None


def pool():
    global _pool
    if ConnectionPool is None:
        raise RuntimeError(_POOL_MISSING_MSG)
    if _pool is None:
        _pool = ConnectionPool(
            _database_url(),
            min_size=1,
            max_size=5,
            open=True,
            kwargs={"row_factory": dict_row, "connect_timeout": 10},
        )
    return _pool


def connect():
    """Borrow a connection from the module-level pool.

    There is no silent per-call psycopg.connect() fallback: a missing pool
    package is a deployment error and must fail loudly (see _POOL_MISSING_MSG).
    """
    if ConnectionPool is None:
        raise RuntimeError(_POOL_MISSING_MSG)
    return pool().connection()


def table(name: str) -> sql.Composed:
    return sql.SQL("{}.{}").format(sql.Identifier(SCHEMA), sql.Identifier(name))


def prepare_database():
    """Create this beginner app's own schema and tables once (startup hook)."""
    with connect() as db:
        db.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(SCHEMA)))
        db.execute(
            sql.SQL(
                "CREATE TABLE IF NOT EXISTS {} ("
                "id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, "
                "email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, "
                "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
            ).format(table("users"))
        )
        db.execute(
            sql.SQL(
                "CREATE TABLE IF NOT EXISTS {} ("
                "id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL "
                "REFERENCES {}(id) ON DELETE CASCADE, "
                "file_name TEXT NOT NULL, content_type TEXT NOT NULL, "
                "image_data BYTEA NOT NULL, "
                "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
            ).format(table("photos"), table("users"))
        )
        db.execute(
            sql.SQL(
                "CREATE INDEX IF NOT EXISTS photos_user_date_idx ON {}(user_id, created_at DESC)"
            ).format(table("photos"))
        )
        # Password reset tokens (30-minute single-use tokens, hash-only at rest).
        db.execute(
            sql.SQL(
                "CREATE TABLE IF NOT EXISTS {} ("
                "id BIGSERIAL PRIMARY KEY, "
                "user_id BIGINT NOT NULL REFERENCES {}(id) ON DELETE CASCADE, "
                "token_hash TEXT NOT NULL UNIQUE, "
                "expires_at TIMESTAMPTZ NOT NULL, "
                "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
            ).format(table("password_resets"), table("users"))
        )
        # Optional columns for problem-scoped submissions (added for parity with the original).
        for col in ("problem_id TEXT", "label TEXT", "title TEXT"):
            try:
                db.execute(
                    sql.SQL("ALTER TABLE {} ADD COLUMN IF NOT EXISTS {}").format(
                        table("photos"), sql.SQL(col)
                    )
                )
            except Exception:
                pass
        # Case-insensitive unique email index (keeps query using lower(email)).
        try:
            db.execute(
                sql.SQL(
                    "CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON {} (lower(email))"
                ).format(table("users"))
            )
        except Exception:
            # May fail when duplicate pre-existing rows exist; logged by caller.
            pass
        db.commit()


def unique_violation(error) -> bool:
    return isinstance(error, psycopg_errors.UniqueViolation)
