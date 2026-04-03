@echo off
:: ─────────────────────────────────────────────────────────────────────────────
::  Storage Optimizer — Windows Launcher
::  Tự động cài Node.js nếu chưa có, rồi khởi động ứng dụng
::  Usage: Double-click start.bat (hoặc chạy trong Command Prompt)
:: ─────────────────────────────────────────────────────────────────────────────

chcp 65001 > nul
title Storage Optimizer — Đang khởi động...

echo.
echo   ╔══════════════════════════════════════════════╗
echo   ║   🖥️  Storage Optimizer — Windows            ║
echo   ║   Phân tích  •  Dọn dẹp  •  Quản lý ổ đĩa  ║
echo   ╚══════════════════════════════════════════════╝
echo.

:: ── Kiểm tra Node.js ──────────────────────────────────────────────────────────
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Node.js chưa được cài đặt.
    echo   [>>] Đang tự động tải và cài đặt Node.js LTS...
    echo.
    call :INSTALL_NODE
    if %errorlevel% neq 0 (
        echo   [X] Cài đặt Node.js thất bại.
        echo       Vui lòng tải thủ công tại: https://nodejs.org
        pause
        exit /b 1
    )
)

:: Refresh PATH sau khi cài mới
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"

:: Verify lại
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Node.js đã cài nhưng cần khởi động lại máy tính để áp dụng PATH.
    echo   Vui lòng khởi động lại rồi chạy lại file này.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo   [OK] Node.js %NODE_VER% sẵn sàng

:: ── Cài dependencies nếu chưa có ─────────────────────────────────────────────
if not exist "%~dp0node_modules\" (
    echo   [..] Đang cài đặt dependencies lần đầu...
    cd /d "%~dp0"
    npm install --silent
    if %errorlevel% neq 0 (
        echo   [X] npm install thất bại. Kiểm tra kết nối mạng.
        pause
        exit /b 1
    )
    echo   [OK] Dependencies đã cài xong
)

:: ── Tạo shortcut trên Desktop (nếu chưa có) ─────────────────────────────────
call :CREATE_SHORTCUT

:: ── Dừng tiến trình cũ trên cổng 7788 ───────────────────────────────────────
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":7788 " 2^>nul') do (
    taskkill /f /pid %%a > nul 2>&1
)

:: ── Khởi động server ──────────────────────────────────────────────────────────
title Storage Optimizer — http://localhost:7788
echo.
echo   ════════════════════════════════════════════
echo   [>>] Server đang chạy tại http://localhost:7788
echo   [>>] Mở trình duyệt...
echo   Nhấn Ctrl+C để dừng.
echo   ════════════════════════════════════════════
echo.

:: Mở trình duyệt sau 2 giây
timeout /t 2 /nobreak > nul
start "" "http://localhost:7788"

cd /d "%~dp0"
node server.js

pause
exit /b 0

:: ═════════════════════════════════════════════════════════════════════════════
:: SUBROUTINE: Tự động cài Node.js bằng PowerShell
:: ═════════════════════════════════════════════════════════════════════════════
:INSTALL_NODE
echo   [1/3] Đang kiểm tra phiên bản Node.js mới nhất...

:: Tải Node.js LTS Installer
set "NODE_MSI=%TEMP%\nodejs_installer.msi"
set "NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi"

echo   [2/3] Đang tải Node.js LTS (v22 LTS) từ nodejs.org...
echo         URL: %NODE_URL%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' -UseBasicParsing; Write-Host '[OK] Tải xong' } catch { Write-Host '[X] Lỗi tải: ' + $_.Exception.Message; exit 1 }"

if %errorlevel% neq 0 (
    echo   [X] Không thể tải Node.js. Kiểm tra kết nối mạng.
    exit /b 1
)

echo   [3/3] Đang cài đặt Node.js (có thể mất 1-2 phút)...
msiexec /i "%NODE_MSI%" /quiet /norestart ADDLOCAL=ALL
set INSTALL_ERR=%errorlevel%

:: Dọn file tạm
del "%NODE_MSI%" > nul 2>&1

if %INSTALL_ERR% neq 0 (
    echo   [X] Cài đặt thất bại. Thử chạy lại với quyền Administrator.
    exit /b 1
)

echo   [OK] Node.js đã được cài đặt thành công!
exit /b 0

:: ═════════════════════════════════════════════════════════════════════════════
:: SUBROUTINE: Tạo shortcut Desktop
:: ═════════════════════════════════════════════════════════════════════════════
:CREATE_SHORTCUT
set "SHORTCUT=%USERPROFILE%\Desktop\Storage Optimizer.lnk"
if exist "%SHORTCUT%" exit /b 0

echo   [>>] Đang tạo shortcut trên Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%~dpnx0'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Storage Optimizer - Phan tich va don dep o dia'; $s.IconLocation = 'shell32.dll,174'; $s.Save(); Write-Host '[OK] Shortcut da tao tai Desktop'"
exit /b 0
