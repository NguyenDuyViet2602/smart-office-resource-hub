# Smart Office Resource Hub

Hệ thống quản lý và đặt chỗ tài nguyên văn phòng thông minh tích hợp AI, hỗ trợ đặt phòng họp, mượn/trả thiết bị, nhận diện thiết bị bằng camera YOLOv8, và trò chuyện đặt phòng bằng ngôn ngữ tự nhiên qua Google Gemini AI.

---

## Mục lục

1. [Yêu cầu môi trường](#1-yêu-cầu-môi-trường)
2. [Cách cài đặt và khởi chạy dự án](#2-cách-cài-đặt-và-khởi-chạy-dự-án)
   - [Cách 1: Docker Compose (khuyến nghị)](#cách-1-docker-compose-khuyến-nghị)
   - [Cách 2: Chạy thủ công từng service](#cách-2-chạy-thủ-công-từng-service)
3. [Tài khoản đăng nhập mặc định](#3-tài-khoản-đăng-nhập-mặc-định)
4. [Cấu trúc thư mục và mô tả chức năng chính](#4-cấu-trúc-thư-mục-và-mô-tả-chức-năng-chính)
5. [Tính năng chính](#5-tính-năng-chính)
6. [Biến môi trường](#6-biến-môi-trường)

---

## 1. Yêu cầu môi trường

> Stack thực tế của dự án: Node.js (Backend NestJS + Frontend Next.js), Python (AI Vision), PostgreSQL, Redis, Docker. Dự án này **không dùng PHP/Apache**.

### Chạy bằng Docker (khuyến nghị)

| Công cụ | Phiên bản tối thiểu |
|---|---|
| Docker | 24+ |
| Docker Compose | v2.20+ (plugin, lệnh `docker compose`) |

### Chạy thủ công (development)

| Công cụ | Phiên bản |
|---|---|
| Node.js | 20 LTS trở lên |
| npm | 10+ |
| Python | 3.12+ |
| PostgreSQL | 16+ |
| Redis | 7+ |
| NVIDIA GPU + CUDA *(tùy chọn)* | Cho AI Vision chạy nhanh hơn |

---

## 2. Cách cài đặt và khởi chạy dự án

### Cách 1: Docker Compose (khuyến nghị)

Chạy toàn bộ hệ thống (PostgreSQL, Redis, Backend, Frontend, AI Vision) chỉ với một lệnh.

**Bước 1 — Cấu hình biến môi trường**

```bash
# Tạo file .env cho backend từ file mẫu
cp backend/.env.example backend/.env
```

Mở `backend/.env` và điền các API key cần thiết:

```env
# Bắt buộc để AI Chat hoạt động
GEMINI_API_KEY=your-gemini-api-key

# Tuỳ chọn: nhận thông báo qua Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

> Nếu không có API key, hệ thống vẫn chạy bình thường — chỉ tắt tính năng AI Chat và thông báo Telegram.

**Bước 2 — Khởi động**

```bash
docker compose up -d
```

Tương đương cách chạy nhanh toàn bộ dự án trên local (frontend + backend + DB + redis + AI Vision).

**Bước 3 — Tạo dữ liệu mẫu**

```bash
# Seed tài khoản admin, phòng họp và thiết bị mẫu vào database
docker compose exec backend npx ts-node src/seed.ts
```

**Truy cập**

| Service | URL |
|---|---|
| **Giao diện web (Frontend)** | http://localhost:3001 |
| **Backend API** | http://localhost:3000 |
| **Swagger API Docs** | http://localhost:3000/api/docs |
| **AI Vision Service** | http://localhost:8000 |

**Lệnh hữu ích**

```bash
# Xem logs
docker compose logs -f backend
docker compose logs -f frontend

# Export PostgreSQL ra file .sql
./infrastructure/scripts/backup-db.sh

# Export với cấu hình tuỳ chỉnh
DB_NAME=smart_office DB_USER=postgres CONTAINER=smart-office-postgres ./infrastructure/scripts/backup-db.sh

# Dừng tất cả
docker compose down

# Dừng và xoá toàn bộ dữ liệu (database, redis)
docker compose down -v
```

---

### Cách 2: Chạy thủ công từng service

#### Chuẩn bị PostgreSQL và Redis

```bash
# Chạy PostgreSQL (port 5432) và Redis (port 6379)
# Có thể dùng Docker chỉ cho 2 service này:
docker compose up -d postgres redis
```

#### Backend (NestJS — Port 3000)

```bash
cd backend
npm install

# Tạo file .env
cp .env.example .env
# Chỉnh sửa .env nếu cần

npm run start:dev
```

#### Frontend (Next.js — Port 3001)

```bash
cd frontend
npm install

# Tạo file .env.local
cp .env.example .env.local
# Mặc định đã trỏ về http://localhost:3000

npm run dev -- -p 3001
```

#### AI Vision (Python FastAPI — Port 8000)

```bash
cd ai-vision
python -m venv .venv
source .venv/bin/activate      # Linux/macOS
# .venv\Scripts\activate       # Windows

pip install -r requirements.txt
python main.py
```

#### Seed dữ liệu mẫu

```bash
cd backend
npx ts-node src/seed.ts
```

---

## 3. Tài khoản đăng nhập mặc định

> Chạy lệnh seed ở trên trước khi đăng nhập.

| Vai trò | Email | Mật khẩu |
|---|---|---|
| **Admin** | `admin@company.com` | `admin123` |
| **Nhân viên** | `employee@company.com` | `employee123` |

**Admin** có toàn quyền: quản lý phòng, tầng, thiết bị, người dùng, xem mọi lịch đặt.

**Nhân viên** có thể: xem bản đồ, đặt phòng, mượn thiết bị, dùng AI chat.

---

## 4. Cấu trúc thư mục và mô tả chức năng chính

```
smart-office-resourcece-hub/
│
├── backend/                    # NestJS REST API (Port 3000)
│   └── src/
│       ├── modules/
│       │   ├── auth/           # Đăng nhập, JWT, phân quyền Admin/Employee
│       │   ├── users/          # Quản lý tài khoản người dùng
│       │   ├── floors/         # Tầng toà nhà (lưu SVG bản đồ)
│       │   ├── rooms/          # Phòng họp (trạng thái, sức chứa, toạ độ bản đồ)
│       │   ├── bookings/       # Đặt phòng/mượn thiết bị (Redlock + Pessimistic Lock)
│       │   ├── equipment/      # Thiết bị văn phòng (laptop, máy chiếu, ...)
│       │   ├── ai-agent/       # AI Chat tích hợp Google Gemini 2.5 Flash
│       │   └── notifications/  # Telegram Bot gửi thông báo
│       └── seed.ts             # Script tạo dữ liệu mẫu ban đầu
│
├── frontend/                   # Next.js App Router (Port 3001)
│   └── src/
│       ├── app/
│       │   ├── login/          # Trang đăng nhập
│       │   ├── register/       # Trang đăng ký
│       │   ├── map/            # Bản đồ văn phòng SVG tương tác
│       │   ├── bookings/       # Danh sách lịch đặt của tôi
│       │   ├── equipment/      # Danh sách thiết bị, mượn/trả
│       │   └── admin/          # Trang quản trị (rooms, users, bookings, equipment)
│       ├── components/
│       │   ├── layout/         # Sidebar, DashboardLayout
│       │   ├── map/            # OfficeMap — render SVG màu theo trạng thái
│       │   ├── bookings/       # BookingModal — form chọn giờ đặt phòng
│       │   └── ai-chat/        # AiChatWidget — hộp chat AI nổi góc màn hình
│       └── lib/
│           ├── api.ts          # Axios client + tất cả API calls
│           ├── auth.ts         # Helpers JWT (lưu/đọc token)
│           └── socket.ts       # Socket.IO client (WebSocket real-time)
│
├── ai-vision/                  # Python FastAPI + YOLOv8 (Port 8000)
│   ├── main.py                 # API: POST /detect — nhận ảnh base64, trả kết quả
│   ├── detector.py             # YOLO inference, map nhãn → EquipmentType
│   └── requirements.txt
│
├── infrastructure/
│   ├── terraform/              # Hạ tầng AWS (ECS Fargate, RDS, ElastiCache, ALB)
│   └── scripts/deploy.sh       # Script deploy lên AWS
│
├── docker-compose.yml          # Dev: tất cả services + hot-reload
└── docker-compose.prod.yml     # Production build
```

---

## 5. Tính năng chính

### Giai đoạn 1 — Quản lý & Đặt chỗ
- Đặt phòng họp với chống trùng lịch (Pessimistic Lock + Redis Redlock)
- Mượn/trả thiết bị văn phòng, theo dõi ai đang giữ và hạn trả
- Bản đồ văn phòng SVG tương tác — xanh (trống), đỏ (đã đặt), vàng (bảo trì)
- Cập nhật real-time qua WebSocket (Socket.IO) khi có người đặt/huỷ
- Xác thực JWT, phân quyền Admin / Employee

### Giai đoạn 2 — AI Automation
- **AI Visual Verification**: Dí thiết bị vào camera → YOLOv8 nhận diện → tự động xác nhận trả
- **AI Chat-to-Book**: Gõ tiếng Việt tự nhiên → Gemini AI hiểu và đặt phòng
  - Ví dụ: *"Book phòng 8 người lúc 3h chiều ngày mai có máy chiếu"*

### Giai đoạn 3 — Cloud & Notification
- Docker Compose cho môi trường dev và prod
- Terraform triển khai lên AWS (ECS Fargate, RDS PostgreSQL, ElastiCache Redis, ALB)
- Telegram Bot: xác nhận đặt chỗ ✅, nhắc họp 30 phút trước ⏰, nhắc trả thiết bị ⚠️

---

## 6. Biến môi trường

### `backend/.env`

| Biến | Mô tả | Giá trị mặc định |
|---|---|---|
| `DB_HOST` | Host PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_USERNAME` | User PostgreSQL | `postgres` |
| `DB_PASSWORD` | Password PostgreSQL | `postgres` |
| `DB_NAME` | Tên database | `smart_office` |
| `REDIS_HOST` | Host Redis | `localhost` |
| `REDIS_PORT` | Port Redis | `6379` |
| `JWT_SECRET` | Khoá ký JWT *(đổi ở production)* | *(chuỗi ngẫu nhiên)* |
| `JWT_EXPIRES_IN` | Thời hạn token | `7d` |
| `PORT` | Port backend | `3000` |
| `GEMINI_API_KEY` | API key Google Gemini (AI Chat) | *(để trống = tắt AI)* |
| `AI_VISION_URL` | URL service AI Vision | `http://localhost:8000` |
| `TELEGRAM_BOT_TOKEN` | Token Telegram Bot | *(để trống = tắt thông báo)* |

### `frontend/.env.local`

| Biến | Mô tả | Giá trị mặc định |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL Backend API | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | URL WebSocket | `http://localhost:3000` |

## Cấu hình AI

### AI Chat Agent (OpenAI)
Thêm `OPENAI_API_KEY` vào `backend/.env`. Agent sử dụng **GPT-4o-mini** với function calling.

### AI Vision (YOLOv8)
Mặc định sử dụng `yolov8n.pt` (pre-trained COCO). Để nhận diện thiết bị chính xác hơn:

1. Thu thập ảnh các thiết bị văn phòng
2. Annotate bằng [Roboflow](https://roboflow.com)
3. Fine-tune: `yolo train model=yolov8n.pt data=dataset.yaml epochs=50`
4. Thay thế `ai-vision/models/yolov8n.pt` bằng model đã train

### Telegram Bot
1. Tạo bot tại [@BotFather](https://t.me/BotFather)
2. Lấy token và thêm vào `backend/.env`
3. Người dùng cần cung cấp `telegramChatId` trong profile

## Deploy lên AWS

```bash
# 1. Khởi tạo Terraform
cd infrastructure/terraform
terraform init
terraform apply

# 2. Deploy images
export AWS_REGION=ap-southeast-1
export AWS_ACCOUNT_ID=<your-account-id>
export API_URL=https://api.yourdomain.com
export WS_URL=https://api.yourdomain.com
bash infrastructure/scripts/deploy.sh
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | NestJS, TypeORM, PostgreSQL, Redis |
| Frontend | Next.js 15, Tailwind CSS, Socket.IO client |
| AI Vision | Python, FastAPI, YOLOv8 (Ultralytics) |
| AI Agent | OpenAI GPT-4o-mini, Function Calling |
| Real-time | Socket.IO (WebSocket) |
| Notifications | Telegram Bot (Telegraf) |
| Concurrency | PostgreSQL Pessimistic Lock + Redis Redlock |
| DevOps | Docker, Terraform, AWS ECS/RDS/ElastiCache/ALB |
