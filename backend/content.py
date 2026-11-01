"""Read the exercise library from simple JSON files shipped with the website."""
import json
import unicodedata
from functools import lru_cache
from pathlib import Path

# Prefer a top-level data/ directory (bundled with the serverless function on
# Vercel, not exposed as static files). Fall back to public/data for local dev.
_BASE = Path(__file__).resolve().parents[1]
DATA = _BASE / "data" if (_BASE / "data").is_dir() else _BASE / "public" / "data"


def fold_text(value: str) -> str:
    """Normalize Vietnamese text for search (computed once per problem at load)."""
    value = str(value).replace("đ", "d").replace("Đ", "D")
    return "".join(
        char for char in unicodedata.normalize("NFD", value)
        if unicodedata.category(char) != "Mn"
    ).lower()


def _content_cache_key():
    files = []
    for directory in (DATA / "sources", DATA / "theory"):
        try:
            for path in sorted(directory.glob("*.json")):
                try:
                    files.append((str(path), path.stat().st_mtime))
                except OSError:
                    files.append((str(path), 0.0))
        except OSError:
            pass
    for path in (DATA / "books.json", DATA / "docs.json"):
        try:
            files.append((str(path), path.stat().st_mtime))
        except OSError:
            files.append((str(path), 0.0))
    return tuple(files)


@lru_cache(maxsize=1)
def _all_data_cached(cache_key):
    # Serverless instances are fresh per deploy; cache key includes file mtimes.
    collections = []
    for file in sorted((DATA / "sources").glob("*.json")):
        if file.name.startswith("_"):
            continue
        try:
            items = json.loads(file.read_text(encoding="utf-8"))
            if isinstance(items, list):
                collections.extend(items)
        except (OSError, json.JSONDecodeError):
            continue
    unique_collections = {}
    seen_problems = set()
    for item in collections:
        if not isinstance(item, dict) or not item.get("id"):
            continue
        old = unique_collections.get(item["id"])
        if old is None or len(item.get("problems", [])) > len(old.get("problems", [])):
            unique_collections[item["id"]] = item
    clean = []
    for item in unique_collections.values():
        copy = dict(item)
        copy["problems"] = []
        title = str(item.get("title", ""))
        province = str(item.get("province", ""))
        for problem in item.get("problems", []):
            if isinstance(problem, dict) and problem.get("id") and problem["id"] not in seen_problems:
                seen_problems.add(problem["id"])
                # Precompute the search key once per problem at load time.
                problem["_search"] = fold_text(
                    " ".join([
                        str(problem.get("label", "")),
                        str(problem.get("text", "")),
                        title,
                        province,
                    ])
                )
                copy["problems"].append(problem)
        clean.append(copy)
    clean.sort(key=lambda item: (-(int(item.get("year") or 0)), str(item.get("title", ""))))
    lessons = []
    for file in sorted((DATA / "theory").glob("*.json")):
        if file.name.startswith("_"):
            continue
        try:
            part = json.loads(file.read_text(encoding="utf-8"))
            if isinstance(part, list):
                lessons.extend(part)
        except (OSError, json.JSONDecodeError):
            pass
    books = read_array(DATA / "books.json")
    docs = read_array(DATA / "docs.json")
    return {"collections": clean, "lessons": lessons, "books": books, "docs": docs}


def read_array(file):
    try:
        value = json.loads(file.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def filter_text(items, search, fields):
    search = search.casefold().strip()
    if search:
        items = [item for item in items if any(search in str(item.get(field, "")).casefold() for field in fields)]
    return items


def all_data():
    return _all_data_cached(_content_cache_key())
