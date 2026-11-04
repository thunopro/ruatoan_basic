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
        copy["_search"] = fold_text(f"{title} {province} {item.get('kind', '')} {item.get('year', '')}")
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

    # Build flat problems list and O(1) collection lookup
    flat_problems = []
    collections_by_id = {}
    for item in clean:
        collections_by_id[item["id"]] = item
        cid = item.get("id")
        ctitle = item.get("title", "")
        cgrade = item.get("grade")
        cyear = item.get("year")
        for p in item.get("problems", []):
            topics = p.get("topics") or []
            flat_problems.append({
                "id": p.get("id"),
                "label": p.get("label", "Bài"),
                "text": p.get("text", ""),
                "topics": topics,
                "topic": topics[0] if topics else "",
                "collectionId": cid,
                "collectionTitle": ctitle,
                "grade": cgrade,
                "year": cyear,
                "_search": p.get("_search", ""),
            })

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

    # Precompute curriculum topic stats
    alias = {
        "phuong-trinh": "dai-so", "he-phuong-trinh": "dai-so", "da-thuc": "dai-so",
        "chia-het": "so-hoc", "so-nguyen-to": "so-hoc", "nghiem-nguyen": "so-hoc",
        "dong-du": "so-hoc", "tam-giac-dong-dang": "hinh-hoc", "tu-giac-noi-tiep": "hinh-hoc",
        "duong-tron": "hinh-hoc", "cuc-tri-hinh-hoc": "hinh-hoc",
        "dirichlet": "to-hop", "nguyen-ly-cuc-han": "to-hop", "roi-rac": "to-hop",
    }
    topic_counts = {"so-hoc": 0, "dai-so": 0, "hinh-hoc": 0, "bat-dang-thuc": 0, "to-hop": 0}
    for p in flat_problems:
        for t in p["topics"]:
            k = alias.get(t, t)
            if k in topic_counts:
                topic_counts[k] += 1

    stats = {
        "collections": len(clean),
        "problems": len(flat_problems),
        "lessons": len(lessons),
        "books": len(books),
        "docs": len(docs),
        "topics": topic_counts,
    }

    return {
        "collections": clean,
        "collections_by_id": collections_by_id,
        "problems": flat_problems,
        "lessons": lessons,
        "books": books,
        "docs": docs,
        "stats": stats,
    }


def read_array(file):
    try:
        value = json.loads(file.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def filter_text(items, search, fields):
    words = fold_text(search).split()
    if words:
        items = [
            item for item in items
            if all(w in fold_text(" ".join(str(item.get(field, "")) for field in fields)) for w in words)
        ]
    return items


def all_data():
    return _all_data_cached(_content_cache_key())
