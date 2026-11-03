"""Automated smoke test for Rua Toan Basic.

Starts a local Uvicorn server (using .env.local), exercises the public and
account/photo flows, and exits non-zero on any failure. Run from the project root:

    python scripts/smoke_test.py

Requires: requests, a working .env.local (DATABASE_URL, SESSION_SECRET), and the
project's .venv with uvicorn installed.
"""
import os
import subprocess
import sys
import time
import uuid

import requests

PORT = 8199
BASE = f"http://127.0.0.1:{PORT}"


def main():
    env = dict(os.environ)
    # The reset-token flow is testable locally without an email provider.
    env["PASSWORD_RESET_DEBUG"] = "1"
    # Load .env.local if present
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in ('"', "'"):
                    v = v[1:-1]
                env[k.strip()] = v

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app",
         "--host", "127.0.0.1", "--port", str(PORT)],
        cwd=os.path.dirname(os.path.dirname(__file__)),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        # wait for readiness
        for _ in range(30):
            try:
                r = requests.get(f"{BASE}/", timeout=2)
                if r.status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(1)
        else:
            raise SystemExit("server did not start")

        failures = []

        def check(name, cond, detail=""):
            if not cond:
                failures.append(f"{name}: {detail}")
                print(f"FAIL  {name} {detail}")
            else:
                print(f"ok    {name}")

        # 1. home + stats
        r = requests.get(f"{BASE}/")
        check("home 200", r.status_code == 200)
        r = requests.get(f"{BASE}/api/stats")
        check("stats", r.status_code == 200 and "collections" in r.json() and "topics" in r.json())
        r = requests.get(f"{BASE}/api/collections?limit=3")
        check("collections list", r.status_code == 200 and r.json().get("total", 0) > 0)
        r = requests.get(f"{BASE}/api/daily")
        daily = r.json() if r.status_code == 200 else {}
        check("daily", r.status_code == 200 and daily.get("problem") and daily.get("collection"), r.text)
        problem_id = (daily.get("problem") or {}).get("id")

        # 2. register + login + me
        email = f"smoke_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE}/api/register", json={"name": "Smoke", "email": email, "password": "pass1234"})
        check("register", r.status_code == 200 and r.json().get("user", {}).get("email") == email, r.text)
        s = requests.Session()
        r = s.post(f"{BASE}/api/login", json={"email": email, "password": "pass1234"})
        check("login", r.status_code == 200, r.text)
        r = s.get(f"{BASE}/api/me")
        check("me", r.status_code == 200 and r.json().get("user", {}).get("email") == email, r.text)

        # 3. bad login rejected
        r = requests.post(f"{BASE}/api/login", json={"email": email, "password": "wrong"})
        check("bad login 401", r.status_code == 401)

        # 4. photo upload + list + delete
        png = (
            b"\x89PNG\r\n\x1a\n"
            b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
            b"\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01\x01\x00\xc9\xfe\x92\xef"
            b"\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        r = s.post(f"{BASE}/api/photos", data={"problem_id": problem_id or ""}, files={"files": ("tiny.png", png, "image/png")})
        check("photo upload", r.status_code == 200 and r.json().get("items"), r.text)
        photo_id = r.json()["items"][0]["id"] if r.status_code == 200 and r.json().get("items") else None
        uploaded_problem_id = r.json()["items"][0].get("problem_id") if r.status_code == 200 and r.json().get("items") else None
        check("photo problem_id", uploaded_problem_id == (problem_id or None) or uploaded_problem_id == problem_id, r.text)
        r = s.get(f"{BASE}/api/photos")
        check("photo list", r.status_code == 200 and any(p["id"] == photo_id for p in r.json().get("items", [])))
        r = s.get(f"{BASE}/api/photos", params={"problem": problem_id} if problem_id else None)
        check("photo list by problem", r.status_code == 200 and any(p["id"] == photo_id for p in r.json().get("items", [])))
        r = s.get(f"{BASE}/api/photos/{photo_id}")
        check("photo get", r.status_code == 200 and r.headers.get("x-content-type-options") == "nosniff")
        r = s.delete(f"{BASE}/api/photos/{photo_id}")
        check("photo delete", r.status_code == 200)
        r = s.get(f"{BASE}/api/photos")
        check("photo gone", r.status_code == 200 and not any(p["id"] == photo_id for p in r.json().get("items", [])))

        # 5. change password
        r = s.post(f"{BASE}/api/change-password", json={"old_password": "pass1234", "new_password": "newpass5678"})
        check("change password", r.status_code == 200, r.text)
        s.post(f"{BASE}/api/logout")
        r = requests.post(f"{BASE}/api/login", json={"email": email, "password": "pass1234"})
        check("old password rejected", r.status_code == 401)
        r = requests.post(f"{BASE}/api/login", json={"email": email, "password": "newpass5678"})
        check("new password works", r.status_code == 200, r.text)
        s = requests.Session()
        s.post(f"{BASE}/api/login", json={"email": email, "password": "newpass5678"})

        # 7. password reset flow
        reset_email = f"reset_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE}/api/register", json={"name": "Reset", "email": reset_email, "password": "pass1234"})
        check("reset register", r.status_code == 200, r.text)
        r = requests.post(f"{BASE}/api/request-reset", json={"email": reset_email})
        check("request reset", r.status_code == 200 and r.json().get("token"), r.text)
        reset_token = r.json().get("token") if r.status_code == 200 else None
        r = requests.post(f"{BASE}/api/reset-password", json={"token": reset_token, "new_password": "resetpass9"})
        check("reset password", r.status_code == 200, r.text)
        r = requests.post(f"{BASE}/api/login", json={"email": reset_email, "password": "resetpass9"})
        check("login after reset", r.status_code == 200, r.text)
        r = requests.post(f"{BASE}/api/login", json={"email": reset_email, "password": "pass1234"})
        check("old password after reset rejected", r.status_code == 401)

        # 6. unauthenticated photo access rejected
        r = requests.get(f"{BASE}/api/photos")
        check("photos 401 anon", r.status_code == 401)

        # 6. logout
        r = s.post(f"{BASE}/api/logout")
        check("logout", r.status_code == 200)
        r = s.get(f"{BASE}/api/me")
        check("me after logout", r.status_code == 200 and r.json().get("user") is None)

        if failures:
            print(f"\n{len(failures)} failure(s):")
            for f in failures:
                print("  -", f)
            raise SystemExit(1)
        print("\nAll smoke checks passed.")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
