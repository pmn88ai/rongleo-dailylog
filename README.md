# 📓 Daily Journal App

## 🚀 Mục tiêu

App ghi nhật ký công việc:

* calendar tuần / tháng
* theo dõi công việc
* lưu Supabase
* dùng đa thiết bị

---

## 🧱 Công nghệ

* React (Vite)
* Supabase
* LocalStorage fallback

---

## ⚙️ Setup Local

### 1. Tạo project

```bash
npm create vite@latest daily-journal
cd daily-journal
npm install
```

---

### 2. Replace code

* Mở `src/App.jsx`
* Dán file JSX của bạn

---

### 3. Cài Supabase CDN (nếu cần)

Trong `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
```

---

### 4. Chạy app

```bash
npm run dev
```

---

## ⚙️ Cấu hình trong app

Mở app → vào ⚙️ Settings:

### Supabase

* URL: từ project Supabase
* anon key: từ project Supabase

### AI (optional)

* API key (Claude/OpenAI)
* bật/tắt AI

---

## 🗄️ Database

Chạy SQL trong Supabase:

* bảng: `daily_logs`

---

## 🔄 Sync

* data lưu trên Supabase
* fallback localStorage nếu offline

---

## 📤 Export

* tải JSON toàn bộ dữ liệu

---

## 📥 Import

* import JSON
* validate trước khi ghi

---

## 🚀 Deploy Vercel

### 1. Push code lên GitHub

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin <repo>
git push -u origin main
```

---

### 2. Deploy

* vào https://vercel.com
* import repo
* chọn project

👉 Vercel auto detect Vite

---

### 3. Xong

Mở link → vào Settings → nhập config

---

## 🧠 Ghi chú

* Không lưu key trong code
* Config nằm trong UI
* 1 user: RongLeo

---

## 🐉 Goal

App này là:

👉 “bộ nhớ công việc cá nhân có thể truy vấn”
