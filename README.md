# 🖥️ Disk Manager UI

> **Smart Storage Optimizer** — Phân tích, dọn dẹp và quản lý ổ đĩa thông minh. Hỗ trợ **macOS** và **Windows**.

---

## ⚡ Cách chạy

### macOS
```bash
bash start.sh
```

### Windows
```
Double-click: start.bat
```
Hoặc trong Command Prompt:
```cmd
start.bat
```

> Trình duyệt sẽ tự mở tại **http://localhost:7788**

---

## 📋 Yêu cầu

| | macOS | Windows |
|---|---|---|
| **Node.js** | v16+ | v16+ |
| **Quyền** | User thường | User thường (một số mục cần Admin) |
| **Ổ dữ liệu** | `/Volumes/Data` (tùy chọn) | Bất kỳ ổ nào |

Tải Node.js: https://nodejs.org

---

## 🎯 Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| **Phân tích thông minh** | Giải thích chi tiết từng loại dữ liệu — là gì, an toàn không, điều gì xảy ra khi xóa |
| **Disk Gauge** | Trực quan hóa % sử dụng tất cả ổ đĩa, cảnh báo màu đỏ khi > 90% |
| **Xóa an toàn** | Các cache 100% an toàn để xóa — có confirm trước |
| **Chuyển + Link** | Di chuyển sang ổ khác, tạo Junction/Symlink để app không biết sự khác biệt |
| **Terminal realtime** | Xem log thực tế với timestamp, progress bar |
| **Dọn tổng** | Xóa tất cả cache 1 lần, hiển thị tổng đã giải phóng |
| **Khôi phục** | Hoàn tác "chuyển" — move data về lại ổ gốc |

---

## 🗂️ Những gì được phân tích

### macOS
- Xcode DerivedData, iOS DeviceSupport, Simulators
- Cache: pip, Homebrew, CocoaPods, Playwright, Google, pnpm, node-gyp, Go build, Electron
- Dev: npm, Gradle, Rust cargo, Homebrew
- Apps: VSCode extensions, Chrome data, Downloads

### Windows
- System: %TEMP%, Windows Prefetch, Windows Update Cache, Recycle Bin
- Cache: pip, npm, pnpm, Yarn, Playwright, NuGet, node-gyp, Electron, Chrome, Edge
- Dev: Gradle, Maven, Rust cargo, VSCode extensions
- Personal: Downloads folder

---

## 🔒 Bảo mật

- **Chạy hoàn toàn local** — không gửi data ra ngoài
- **Không tự động xóa** — mọi thao tác đều có confirm dialog
- **Giải thích rõ ràng** — mỗi mục đều có mô tả "điều gì xảy ra" trước khi thực hiện

---

## 🪟 Windows — Lưu ý

**Junction point** (thay cho Symlink):
- Windows dùng Junction để thay thế Symlink cho thư mục
- Junction không cần quyền Administrator (khác với Symlink)
- App hoạt động bình thường như khi data còn trên ổ gốc

**Một số mục cần Admin:**
- Windows Prefetch (`C:\Windows\Prefetch`)
- Windows Update Cache (`C:\Windows\SoftwareDistribution`)
- Recycle Bin trên ổ hệ thống

Chạy `start.bat` bằng **Run as Administrator** nếu cần xóa các mục đó.

---

## 🍎 macOS — Lưu ý

**Symlink** được dùng khi chuyển thư mục:
```
~/.cargo → /Volumes/Data/.system-offload/cargo
```
App tiếp tục đọc/ghi vào `~/.cargo` như bình thường, nhưng data thực tế nằm trên ổ Data.

**Ổ `/Volumes/Data`** là tùy chọn — nếu không có, phần "Chuyển" sẽ không áp dụng được.
