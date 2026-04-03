# 🪟 Hướng dẫn build file .exe Installer cho Windows

## Công cụ cần dùng

**Inno Setup** — miễn phí, phổ biến nhất để đóng gói app Windows thành `.exe`  
Tải tại: https://jrsoftware.org/isinfo.php

---

## Các bước build

### 1. Cài Inno Setup
- Tải và cài **Inno Setup 6** từ trang chính thức
- Cài đặt mặc định là đủ

### 2. Mở script
- Mở **Inno Setup Compiler** (đã cài ở bước 1)
- **File → Open** → chọn file `StorageOptimizer.iss` trong thư mục này

### 3. Build
- Nhấn **Ctrl+F9** hoặc **Build → Compile**
- File `.exe` sẽ được tạo tại: `installer/output/StorageOptimizer-Setup-v1.0.0.exe`

---

## Những gì installer sẽ làm

Khi người dùng chạy file `.exe`:

1. **Kiểm tra Node.js** — nếu chưa có:
   - Tự động tải Node.js LTS v22 từ nodejs.org
   - Cài đặt silent (không cần thao tác thêm)
2. **Cài đặt Storage Optimizer** vào `Program Files`
3. **Chạy `npm install`** để cài dependencies
4. **Tạo shortcut** trên Desktop _(có thể bỏ chọn)_
5. **Tạo shortcut** trong Start Menu _(có thể bỏ chọn)_
6. **Đăng ký Add/Remove Programs** để gỡ cài đặt clean
7. Hỏi có muốn **chạy ngay** sau khi cài xong không

---

## Cấu trúc thư mục

```
installer/
  StorageOptimizer.iss   ← Script Inno Setup (file này)
  output/                ← File .exe được build vào đây (tự tạo)
  README.md              ← Hướng dẫn này
```

---

## Lưu ý

- Nếu muốn thêm icon cho installer: đặt file `icon.ico` vào thư mục `public/`
- Node.js URL trong script là v22.14.0 LTS — cập nhật tại dòng `#define NodeURL` nếu cần
- File `.exe` output khoảng **5–10 MB** (chưa include Node.js — tải online khi cài)
- Để tạo installer offline (bundle Node.js), thêm file MSI vào `[Files]` section

---

## Cập nhật phiên bản

Sửa dòng `#define AppVersion` trong file `.iss`:
```
#define AppVersion "1.1.0"
```
