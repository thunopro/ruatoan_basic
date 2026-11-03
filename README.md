# Rùa Toán Basic

Ứng dụng học Toán THCS gồm trang chủ, kho đề và câu hỏi, chuyên đề, thư viện, tài khoản và nơi lưu ảnh bài làm. Giao diện dùng HTML/CSS/JavaScript; API dùng FastAPI; dữ liệu học tập nằm trong `data/` và tài khoản/ảnh được lưu trong PostgreSQL.

## Chạy trên Windows

Yêu cầu Python 3.11 trở lên và PostgreSQL.

Trên máy đã cấu hình project này, PostgreSQL chạy trong `%LOCALAPPDATA%\RuaToan\PostgreSQL18` và dùng cổng `5433`; hai script trong `scripts/` bật/tắt cụm local đó. Trên máy khác, cài PostgreSQL riêng, đặt `DATABASE_URL` tương ứng trong `.env.local` và bỏ qua script local.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
& .\scripts\start_database.ps1
```

Sửa `.env.local`, điền `DATABASE_URL` của PostgreSQL và đặt `SESSION_SECRET` dài, ngẫu nhiên (ít nhất 24 ký tự). Sau đó nạp biến môi trường và chạy:

```powershell
Get-Content .env.local | Where-Object { $_ -match '^\s*[^#].+=' } | ForEach-Object {
  $name, $value = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim().Trim('"').Trim("'"), 'Process')
}
python -m uvicorn main:app --reload
```

Mở http://127.0.0.1:8000. FastAPI sẽ tự tạo schema và các bảng cần thiết trong database `ruatoan_basic` khi kết nối thành công. Để tắt database local, chạy `& .\scripts\stop_database.ps1`.

### Chạy trên macOS/Linux

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.local
set -a && . ./.env.local && set +a
uvicorn main:app --reload
```

## Cấu hình đặt lại mật khẩu

API đặt lại mật khẩu chỉ trả token trong môi trường phát triển khi đặt `PASSWORD_RESET_DEBUG=true`. Khi triển khai thật, cần kết nối nhà cung cấp email để gửi token cho người dùng; nếu chưa cấu hình email, API chỉ trả phản hồi chung và không làm lộ token. Smoke test bật cờ này riêng cho tiến trình kiểm tra.

## Triển khai

- **Render:** dùng `render.yaml` làm Blueprint. Blueprint tạo web service và PostgreSQL, đồng thời sinh `SESSION_SECRET`.
- **Vercel:** triển khai project với `DATABASE_URL` và `SESSION_SECRET` trong Environment Variables. Dữ liệu JSON cần được đóng gói cùng function; tài khoản và ảnh dùng PostgreSQL.

## API

- `GET /api/stats`, `/api/daily`: thống kê và câu hỏi mỗi ngày.
- `GET /api/collections`, `/api/collections/{id}`: tìm đề, lọc và lấy câu hỏi.
- `GET /api/problems`: tìm câu hỏi theo từ khóa, lớp và chủ đề.
- `GET /api/lessons`, `/api/books`, `/api/docs`: nội dung học và thư viện.
- `POST /api/register`, `/api/login`, `/api/logout`, `GET /api/me`: tài khoản.
- `POST /api/change-password`, `POST /api/request-reset`, `POST /api/reset-password`: quản lý mật khẩu.
- `GET/POST /api/photos`, `GET/DELETE /api/photos/{id}`: ảnh bài làm của tài khoản.

Mật khẩu được băm bằng PBKDF2. Cookie phiên được ký, đặt `HttpOnly` và giới hạn truy cập bằng quyền sở hữu ảnh.
