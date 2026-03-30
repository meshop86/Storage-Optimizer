@echo off
:: ─────────────────────────────────────────────────────────────────────────────
::  Disk Manager UI — Windows Launcher
::  Usage: Double-click start.bat (hoặc chạy trong Command Prompt)
:: ─────────────────────────────────────────────────────────────────────────────

chcp 65001 > nul
title Disk Manager UI

echo.
echo   ╔══════════════════════════════════════╗
echo   ║   🖥️  Disk Manager UI — Windows       ║
echo   ╚══════════════════════════════════════╝
echo.

:: Check Node.js
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Node.js chua duoc cai dat.
    echo   Tai ve tai: https://nodejs.org
    echo.
    echo   Nhan phim bat ky de mo trang tai ve...
    pause > nul
    start https://nodejs.org
    exit /b 1
)

:: Show node version
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo   [OK] Node.js %NODE_VER% detected

:: Install dependencies if needed
if not exist "%~dp0node_modules\" (
    echo   [..] Cai dat dependencies...
    cd /d "%~dp0"
    npm install --silent
    echo   [OK] Dependencies da cai xong
)

:: Kill existing process on port 7788
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":7788" 2^>nul') do (
    taskkill /f /pid %%a > nul 2>&1
)

echo   [>>] Khoi dong server tai http://localhost:7788
echo.
echo   Nhan Ctrl+C de dung.
echo.

cd /d "%~dp0"
node server.js

pause
