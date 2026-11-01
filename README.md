# Rùa Toán Basic

Bản học tập viết bằng HTML, CSS, JavaScript thuần và FastAPI. Trang web dùng các file JSON để đọc nội dung Toán; PostgreSQL lưu tài khoản và ảnh bài làm.

## Thư mục

- `public/`: HTML, CSS, JavaScript, hình ảnh và dữ liệu JSON.
- `public/pages/`: các trang luyện tập, đề, lý thuyết, thư viện, đăng nhập, đăng ký và bài làm.
- `public/js/`: JavaScript của từng trang.
- `backend/`: API FastAPI, kết nối PostgreSQL và đăng nhập.
- `main.py`: điểm bắt đầu cho máy cá nhân và Vercel.

## Chạy trên máy

1. Cài Python 3.11 trở lên.
2. Tạo môi trường và cài thư viện:

   ```sh
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Tạo file `.env.local` từ `.env.example`, điền `DATABASE_URL` PostgreSQL và một `SESSION_SECRET` ngẫu nhiên.
4. Nạp các biến môi trường rồi chạy:

   ```sh
   set -a
   source .env.local
   set +a
   uvicorn main:app --reload
   ```

5. Mở http://127.0.0.1:8000.

Đăng ký lần đầu sẽ tự tạo schema `ruatoan_basic`, bảng `users` và bảng `photos`. Không sửa bảng của ứng dụng khác.

## Đưa lên Vercel

Thêm `DATABASE_URL` và `SESSION_SECRET` trong phần Environment Variables của project Vercel rồi triển khai thư mục này. Ảnh/tài khoản được giữ trong PostgreSQL; thư mục serverless không dùng làm nơi lưu lâu dài. Nội dung JSON trong `public/data` là bộ dữ liệu tĩnh của trang.

## API chính

- `GET /api/stats`: số liệu của kho nội dung.
- `GET /api/collections`: tìm bộ đề, lọc theo lớp, phân trang.
- `GET /api/collections/{id}`: câu hỏi trong một bộ đề.
- `GET /api/problems`: tìm câu hỏi riêng lẻ theo từ khóa, lớp, chủ đề và trang.
- `GET /api/lessons`, `/api/books`, `/api/docs`: nội dung học và thư viện.
- `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`: tài khoản.
- `GET/POST /api/photos`, `GET/DELETE /api/photos/{id}`: ảnh bài làm của tài khoản.

Mật khẩu được băm bằng PBKDF2, không lưu nguyên văn. Cookie phiên được ký và đặt cờ HttpOnly.
