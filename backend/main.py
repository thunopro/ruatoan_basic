"""The small FastAPI backend for Rua Toan Basic."""
import hashlib
import logging
import secrets
import unicodedata
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

import psycopg
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr

from . import auth, content, database

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

# In-memory caches for the aggregate endpoints (/api/stats, /api/daily).
# Parsing the ~16 MB source JSON is accepted once per instance (cold start);
# these caches avoid recomputing the aggregations on every request.
# Invalidation: cached entries store the identity of the data dict returned
# by content.all_data() plus the same mtime-based cache key that content
# itself uses; when the JSON files change (data reload) a new dict and a
# new key are produced, so the cached entries stop matching and are
# recomputed. Basic thread-safety: sync endpoints run in FastAPI's thread
# pool, but module-variable reads/writes are atomic under the GIL — in the
# worst case two threads compute the same aggregation once and both store
# an equivalent result, which is harmless.
_stats_cache = None  # (data_id, cache_key, stats_result)
_daily_cache = None  # (data_id, day_ordinal, daily_result)



@asynccontextmanager
async def lifespan(app):
    try:
        database.prepare_database()
    except Exception:
        logging.exception("Database not ready at startup; routes will return 503.")
    try:
        content.all_data()
    except Exception:
        logging.exception("Failed to warm up content cache.")
    yield


app = FastAPI(title="Rua Toan Basic", version="1.0", lifespan=lifespan)

logging.basicConfig(level=logging.INFO)


# Static folders are served as plain files; the API stays under /api.
# On Vercel these folders are served by the platform's CDN, so they may not be
# present inside the function bundle — mount only when the directory exists.
for _name in ("css", "js", "images"):
    _dir = PUBLIC / _name
    if _dir.is_dir():
        app.mount("/" + _name, StaticFiles(directory=_dir), name=_name)
# Note: /data is intentionally NOT mounted; content is read server-side from JSON files.

# Security headers for every response.
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data:; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; "
        "connect-src 'self'",
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    logging.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Đã xảy ra lỗi. Vui lòng thử lại."})


class AccountForm(BaseModel):
    name: str = ""
    email: EmailStr
    password: str


def is_https(request):
    # Vercel terminates TLS and forwards X-Forwarded-Proto; fall back to scheme.
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    return proto == "https"

def set_session(request, response, user_id):
    response.set_cookie(auth.COOKIE_NAME, auth.make_cookie(user_id), httponly=True,
                        secure=is_https(request), samesite="lax",
                        max_age=60 * 60 * 24 * 14, path="/")


@lru_cache(maxsize=128)
def _read_text_cached(path: str, mtime: float) -> str:
    return Path(path).read_text(encoding="utf-8")


def _cached_page(name: str) -> str | None:
    target = PUBLIC / "pages" / f"{name}.html"
    if not target.is_file():
        return None
    try:
        mtime = target.stat().st_mtime
    except OSError:
        return None
    return _read_text_cached(str(target), mtime)


def _cached_index() -> str:
    target = PUBLIC / "index.html"
    if not target.is_file():
        # On Vercel the page is served by the CDN; return a minimal redirect.
        return "<!doctype html><meta http-equiv='refresh' content='0;url=/index.html'>"
    try:
        mtime = target.stat().st_mtime
    except OSError:
        return "<!doctype html><meta http-equiv='refresh' content='0;url=/index.html'>"
    return _read_text_cached(str(target), mtime)


@app.get("/")
def home():
    return Response(content=_cached_index(), media_type="text/html; charset=utf-8")


@app.get("/pages/{page}.html")
def get_page(page: str):
    safe_names = {"practice", "exams", "lesson", "library", "login", "register", "submissions"}
    if page not in safe_names:
        raise HTTPException(404, "Không tìm thấy trang.")
    content_text = _cached_page(page)
    if content_text is None:
        raise HTTPException(404, "Không tìm thấy trang.")
    return Response(content=content_text, media_type="text/html; charset=utf-8")


def _compute_stats(data):
    alias = {"phuong-trinh": "dai-so", "nghiem-nguyen": "so-hoc"}
    topics = {"so-hoc": 0, "dai-so": 0, "bat-dang-thuc": 0, "hinh-hoc": 0, "to-hop": 0}
    for collection in data["collections"]:
        for problem in collection.get("problems", []):
            for t in (problem.get("topics") or []):
                key = alias.get(t, t)
                if key in topics:
                    topics[key] += 1
    return {"collections": len(data["collections"]),
            "problems": sum(len(x.get("problems", [])) for x in data["collections"]),
            "lessons": len(data["lessons"]), "books": len(data["books"]), "docs": len(data["docs"]),
            "topics": topics}


@app.get("/api/stats")
def get_stats():
    return content.all_data()["stats"]


@app.get("/api/daily")
def daily():
    global _daily_cache
    import datetime, random
    data = content.all_data()
    today = datetime.date.today().toordinal()
    cached = _daily_cache
    if cached is not None and cached[0] == id(data) and cached[1] == today:
        return cached[2]
    all_problems = data["problems"]
    if not all_problems:
        result = {"problem": None, "collection": None}
    else:
        rng = random.Random(today)
        p = all_problems[rng.randrange(len(all_problems))]
        result = {"problem": {"id": p.get("id"), "label": p.get("label", "Bài"),
                              "text": p.get("text", ""), "topics": p.get("topics", [])},
                  "collection": {"id": p.get("collectionId"), "title": p.get("collectionTitle", ""),
                                 "grade": p.get("grade"), "year": p.get("year")}}
    _daily_cache = (id(data), today, result)
    return result


@app.get("/api/collections")
def get_collections(search: str = "", grade: int = 0, kind: str = "", page: int = 1, limit: int = 20):
    items = content.all_data()["collections"]
    search = search.casefold().strip()
    if grade:
        items = [x for x in items if int(x.get("grade") or 0) == grade]
    if kind:
        items = [x for x in items if x.get("kind") == kind]
    if search:
        items = [x for x in items if search in (str(x.get("title", "")) + " " + str(x.get("province", ""))).casefold()]
    limit = min(max(limit, 1), 50)
    page = max(page, 1)
    page_items = items[(page - 1) * limit:page * limit]
    result = []
    for x in page_items:
        summary = {"id": x.get("id"), "title": x.get("title", ""), "grade": x.get("grade"),
                   "year": x.get("year"), "kind": x.get("kind"), "province": x.get("province"),
                   "itemSummary": f"{len(x.get('problems', []))} bài"}
        result.append(summary)
    return {"total": len(items), "page": page, "items": result}


@app.get("/api/problems")
def get_problems(search: str = "", grade: int = 0, topic: str = "", page: int = 1, limit: int = 20):
    """Find individual questions across all collections with instant flat lookup."""
    items = content.all_data()["problems"]
    if grade:
        items = [p for p in items if p.get("grade") == grade]
    if topic:
        topic_aliases = {
            "so-hoc": {"so-hoc", "nghiem-nguyen", "chia-het", "so-nguyen-to", "dong-du"},
            "dai-so": {"dai-so", "phuong-trinh", "he-phuong-trinh", "da-thuc"},
            "hinh-hoc": {"hinh-hoc", "tam-giac-dong-dang", "tu-giac-noi-tiep", "duong-tron", "cuc-tri-hinh-hoc"},
            "bat-dang-thuc": {"bat-dang-thuc"},
            "to-hop": {"to-hop", "dirichlet", "nguyen-ly-cuc-han", "roi-rac"},
        }
        accepted = topic_aliases.get(topic, {topic})
        items = [p for p in items if accepted.intersection(p.get("topics", []))]
    if search:
        words = content.fold_text(search).split()
        if words:
            items = [p for p in items if all(w in p["_search"] for w in words)]
    total = len(items)
    limit = min(max(limit, 1), 50)
    page = max(page, 1)
    start = (page - 1) * limit
    # Keep the internal precomputed search index out of the public response.
    page_items = items[start:start + limit]
    public_items = [{key: value for key, value in item.items() if key != "_search"} for item in page_items]
    return {"total": total, "page": page, "items": public_items}


@app.get("/api/collections/{collection_id}")
def get_collection(collection_id: str, page: int = 1, per: int = 20):
    item = content.all_data()["collections_by_id"].get(collection_id)
    if not item:
        raise HTTPException(404, "Không tìm thấy đề hoặc bộ bài tập.")
    problems = item.get("problems", [])
    per = min(max(per, 1), 50)
    page = max(page, 1)
    start = (page - 1) * per
    cleaned = [{k: v for k, v in p.items() if k != "_search"} for p in problems[start:start + per]]
    return {"id": item.get("id"), "title": item.get("title", ""), "grade": item.get("grade"),
            "year": item.get("year"), "kind": item.get("kind"), "province": item.get("province"),
            "sourceName": item.get("sourceName"), "sourceUrl": item.get("sourceUrl"),
            "total": len(problems), "page": page, "per": per, "items": cleaned, "problems": cleaned}


@app.get("/api/lessons")
def get_lessons(search: str = ""):
    items = content.all_data()["lessons"]
    return {"items": content.filter_text(items, search, ("title", "summary"))}


@app.get("/api/books")
def get_books(search: str = ""):
    return {"items": content.filter_text(content.all_data()["books"], search, ("title", "author", "desc"))}


@app.get("/api/docs")
def get_docs(search: str = ""):
    return {"items": content.filter_text(content.all_data()["docs"], search, ("title", "author", "desc"))}


@app.post("/api/register")
def register(form: AccountForm, request: Request, response: Response):
    if len(form.password) < 8 or len(form.password) > 128:
        raise HTTPException(400, "Mật khẩu cần có từ 8 đến 128 ký tự.")
    name = form.name.strip()[:80]
    if not name:
        raise HTTPException(400, "Vui lòng nhập tên.")
    try:
        with database.connect() as db:
            user = db.execute(
                psycopg.sql.SQL("INSERT INTO {} (name,email,password_hash) VALUES (%s,%s,%s) RETURNING id,name,email").format(database.table("users")),
                (name, form.email.lower(), auth.hash_password(form.password)),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        logging.exception("Register duplicate email")
        raise HTTPException(409, "Email này đã được đăng ký.")
    except Exception:
        logging.exception("Register failed")
        raise HTTPException(503, "Chưa kết nối được database. Kiểm tra DATABASE_URL.")
    set_session(request, response, user["id"])
    return {"user": user}


@app.post("/api/login")
def login(form: AccountForm, request: Request, response: Response):
    email = form.email.lower()
    if auth.login_blocked(email):
        raise HTTPException(429, "Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.")
    try:
        with database.connect() as db:
            user = db.execute(
                psycopg.sql.SQL("SELECT id,name,email,password_hash FROM {} WHERE email=%s").format(database.table("users")),
                (email,),
            ).fetchone()
    except Exception:
        logging.exception("Login query failed")
        raise HTTPException(503, "Chưa kết nối được database. Kiểm tra DATABASE_URL.")
    if not user or not auth.check_password(form.password, user["password_hash"]):
        auth.record_login_failure(email)
        raise HTTPException(401, "Email hoặc mật khẩu chưa đúng.")
    auth.clear_login_failures(email)
    set_session(request, response, user["id"])
    return {"user": {"id": user["id"], "name": user["name"], "email": user["email"]}}


@app.post("/api/logout")
def logout():
    response = Response(content='{"ok":true}', media_type="application/json")
    response.delete_cookie(auth.COOKIE_NAME, path="/")
    return response


@app.get("/api/me")
def me(request: Request):
    user_id = auth.read_user_id(request)
    if not user_id:
        return {"user": None}
    try:
        with database.connect() as db:
            user = db.execute(
                psycopg.sql.SQL("SELECT id,name,email FROM {} WHERE id=%s").format(database.table("users")),
                (user_id,),
            ).fetchone()
        return {"user": user}
    except Exception:
        logging.exception("me query failed")
        return {"user": None}


class PasswordChangeForm(BaseModel):
    old_password: str
    new_password: str


@app.post("/api/change-password")
def change_password(form: PasswordChangeForm, request: Request):
    user_id = auth.require_user(request)
    if not (8 <= len(form.new_password) <= 128):
        raise HTTPException(400, "Mật khẩu mới phải từ 8 đến 128 ký tự.")
    try:
        with database.connect() as db:
            row = db.execute(
                psycopg.sql.SQL("SELECT password_hash FROM {} WHERE id=%s").format(database.table("users")),
                (user_id,),
            ).fetchone()
            if not row or not auth.check_password(form.old_password, row["password_hash"]):
                raise HTTPException(400, "Mật khẩu hiện tại chưa đúng.")
            new_hash = auth.hash_password(form.new_password)
            db.execute(
                psycopg.sql.SQL("UPDATE {} SET password_hash=%s WHERE id=%s").format(database.table("users")),
                (new_hash, user_id),
            )
    except HTTPException:
        raise
    except Exception:
        logging.exception("change password failed")
        raise HTTPException(503, "Không đổi được mật khẩu. Vui lòng thử lại.")
    return {"ok": True}


class PasswordResetRequestForm(BaseModel):
    email: EmailStr


class PasswordResetForm(BaseModel):
    token: str
    new_password: str


@app.post("/api/request-reset")
def request_reset(form: PasswordResetRequestForm):
    # No email provider is configured. Expose the token only in explicit
    # development mode; production responses must never disclose it.
    email = form.email.lower()
    try:
        with database.connect() as db:
            user = db.execute(
                psycopg.sql.SQL("SELECT id FROM {} WHERE lower(email)=%s").format(database.table("users")),
                (email,),
            ).fetchone()
            if not user:
                # Same response as a found account: avoids email enumeration.
                return {"ok": True}
            token = secrets.token_hex(32)  # 32 random bytes as hex (64 chars).
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            # One active token per user; also drop expired rows opportunistically.
            db.execute(
                psycopg.sql.SQL("DELETE FROM {} WHERE user_id=%s OR expires_at < NOW()").format(database.table("password_resets")),
                (user["id"],),
            )
            db.execute(
                psycopg.sql.SQL(
                    "INSERT INTO {} (user_id, token_hash, expires_at) "
                    "VALUES (%s, %s, NOW() + INTERVAL '30 minutes')"
                ).format(database.table("password_resets")),
                (user["id"], token_hash),
            )
    except Exception:
        logging.exception("request reset failed")
        raise HTTPException(503, "Không tạo được yêu cầu đặt lại mật khẩu. Vui lòng thử lại.")
    result = {"ok": True}
    if os.getenv("PASSWORD_RESET_DEBUG", "").lower() in {"1", "true", "yes"}:
        result["token"] = token
    return result


@app.post("/api/reset-password")
def reset_password(form: PasswordResetForm):
    if not (8 <= len(form.new_password) <= 128):
        raise HTTPException(400, "Mật khẩu mới phải từ 8 đến 128 ký tự.")
    # The client only ever holds the raw token; the database stores its SHA-256.
    token_hash = hashlib.sha256(form.token.encode()).hexdigest()
    try:
        with database.connect() as db:
            row = db.execute(
                psycopg.sql.SQL(
                    "SELECT id, user_id FROM {} WHERE token_hash=%s AND expires_at > NOW()"
                ).format(database.table("password_resets")),
                (token_hash,),
            ).fetchone()
            if not row:
                raise HTTPException(400, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.")
            db.execute(
                psycopg.sql.SQL("UPDATE {} SET password_hash=%s WHERE id=%s").format(database.table("users")),
                (auth.hash_password(form.new_password), row["user_id"]),
            )
            # Single-use: remove the token after a successful reset.
            db.execute(
                psycopg.sql.SQL("DELETE FROM {} WHERE id=%s").format(database.table("password_resets")),
                (row["id"],),
            )
    except HTTPException:
        raise
    except Exception:
        logging.exception("reset password failed")
        raise HTTPException(503, "Không đặt lại được mật khẩu. Vui lòng thử lại.")
    return {"ok": True}


PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff"
WEBP_MAGIC = b"RIFF"
WEBP_TAG = b"WEBP"


def _detect_image_type(data: bytes) -> str | None:
    if data.startswith(PNG_MAGIC):
        return "image/png"
    if data.startswith(JPEG_MAGIC):
        return "image/jpeg"
    if len(data) >= 12 and data[:4] == WEBP_MAGIC and data[8:12] == WEBP_TAG:
        return "image/webp"
    return None


@app.post("/api/photos")
async def upload_photos(request: Request, files: list[UploadFile] = File(...),
                       problem_id: str = Form(""), label: str = Form(""), title: str = Form("")):
    user_id = auth.require_user(request)
    if len(files) > 6:
        raise HTTPException(400, "Mỗi lần chọn tối đa 6 ảnh.")
    # Read & validate everything before touching the database.
    prepared = []
    for file in files:
        data = await file.read(1_500_001)
        if not data or len(data) > 1_500_000:
            raise HTTPException(400, "Mỗi ảnh không được lớn hơn 1.5 MB.")
        mime = _detect_image_type(data)
        if mime is None:
            raise HTTPException(400, "Chỉ nhận ảnh JPG, PNG hoặc WebP.")
        prepared.append((file.filename or "anh-bai-lam", mime, data))

    try:
        with database.connect() as db:
            count_row = db.execute(
                psycopg.sql.SQL("SELECT COUNT(*) AS n FROM {} WHERE user_id=%s").format(database.table("photos")),
                (user_id,),
            ).fetchone()
            current = int(count_row["n"] or 0) if count_row else 0
            if current + len(prepared) > 50:
                raise HTTPException(409, "Bạn đã đạt giới hạn 50 ảnh.")
            pid = (problem_id or "").strip()[:120]
            lbl = (label or "").strip()[:120]
            ttl = (title or "").strip()[:200]
            saved = []
            for name, mime, data in prepared:
                row = db.execute(
                    psycopg.sql.SQL(
                        "INSERT INTO {} (user_id,file_name,content_type,image_data,problem_id,label,title) "
                        "VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING id"
                    ).format(database.table("photos")),
                    (user_id, name, mime, data, pid or None, lbl or None, ttl or None),
                ).fetchone()
                saved.append({"id": row["id"], "name": name, "problem_id": pid or None})
    except HTTPException:
        raise
    except Exception:
        logging.exception("Photo upload failed")
        raise HTTPException(503, "Không lưu được ảnh. Kiểm tra kết nối database.")
    return {"items": saved}


@app.get("/api/photos")
def list_photos(request: Request, problem: str = ""):
    user_id = auth.require_user(request)
    try:
        if problem:
            rows = None
            with database.connect() as db:
                rows = db.execute(
                    psycopg.sql.SQL("SELECT id,file_name,problem_id,label,title,created_at FROM {} WHERE user_id=%s AND problem_id=%s ORDER BY created_at DESC LIMIT 100").format(database.table("photos")),
                    (user_id, problem),
                ).fetchall()
        else:
            with database.connect() as db:
                rows = db.execute(
                    psycopg.sql.SQL("SELECT id,file_name,problem_id,label,title,created_at FROM {} WHERE user_id=%s ORDER BY created_at DESC LIMIT 100").format(database.table("photos")),
                    (user_id,),
                ).fetchall()
        return {"items": rows}
    except Exception:
        logging.exception("list photos failed")
        raise HTTPException(503, "Không tải được danh sách ảnh.")


@app.get("/api/photos/{photo_id}")
def photo(photo_id: int, request: Request):
    user_id = auth.require_user(request)
    try:
        with database.connect() as db:
            row = db.execute(
                psycopg.sql.SQL("SELECT content_type,image_data FROM {} WHERE id=%s AND user_id=%s").format(database.table("photos")),
                (photo_id, user_id),
            ).fetchone()
    except Exception:
        logging.exception("photo fetch failed")
        raise HTTPException(503, "Không tải được ảnh.")
    if not row:
        raise HTTPException(404, "Không tìm thấy ảnh.")
    response = Response(content=bytes(row["image_data"]), media_type=row["content_type"])
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: int, request: Request):
    user_id = auth.require_user(request)
    try:
        with database.connect() as db:
            result = db.execute(
                psycopg.sql.SQL("DELETE FROM {} WHERE id=%s AND user_id=%s").format(database.table("photos")),
                (photo_id, user_id),
            )
        if result.rowcount == 0:
            raise HTTPException(404, "Không tìm thấy ảnh.")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        logging.exception("delete photo failed")
        raise HTTPException(503, "Không xóa được ảnh.")
