@echo off
setlocal EnableDelayedExpansion
chcp 65001 > nul 2>&1
title Storage Optimizer

echo.
echo  ================================================
echo    Storage Optimizer - Windows
echo    Phan tich, don dep va quan ly o dia
echo  ================================================
echo.

:: ── Kiem tra Node.js ─────────────────────────────────────────────────────────
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Node.js chua duoc cai dat.
    echo  [>>] Dang tu dong tai va cai dat Node.js LTS...
    echo.
    call :INSTALL_NODE
    if !INSTALL_RESULT! neq 0 (
        echo.
        echo  [X] Cai dat Node.js that bai.
        echo      Vui long tai thu cong tai: https://nodejs.org
        echo.
        pause
        exit /b 1
    )
    echo  [OK] Node.js da duoc cai dat thanh cong!
    echo.
)

:: Them nodejs vao PATH phong khi vua cai xong
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"

:: Verify
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Can khoi dong lai may tinh de ap dung PATH moi.
    echo      Sau khi restart, chay lai file nay.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo  [OK] Node.js !NODE_VER! san sang

:: ── Cai npm dependencies neu chua co ─────────────────────────────────────────
if not exist "%~dp0node_modules\" (
    echo  [..] Dang cai dependencies lan dau...
    cd /d "%~dp0"
    npm install
    if !errorlevel! neq 0 (
        echo  [X] npm install that bai. Kiem tra ket noi mang.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies da cai xong
)

:: ── Tao shortcut Desktop neu chua co ─────────────────────────────────────────
set "SHORTCUT=%USERPROFILE%\Desktop\Storage Optimizer.lnk"
if not exist "%SHORTCUT%" (
    echo  [>>] Tao shortcut tren Desktop...
    set "BATPATH=%~dpnx0"
    set "WORKDIR=%~dp0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('!SHORTCUT!'); $s.TargetPath='!BATPATH!'; $s.WorkingDirectory='!WORKDIR!'; $s.Description='Storage Optimizer'; $s.IconLocation='%SystemRoot%\System32\shell32.dll,174'; $s.Save()" > nul 2>&1
    if !errorlevel! equ 0 echo  [OK] Shortcut da tao tren Desktop
)

:: ── Dung tien trinh cu tren cong 7788 ────────────────────────────────────────
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R ":7788 "') do (
    taskkill /f /pid %%a > nul 2>&1
)

:: ── Khoi dong server ──────────────────────────────────────────────────────────
title Storage Optimizer - http://localhost:7788
echo.
echo  ================================================
echo   [>>] Server: http://localhost:7788
echo   Nhan Ctrl+C de dung.
echo  ================================================
echo.

timeout /t 2 /nobreak > nul
start "" "http://localhost:7788"

cd /d "%~dp0"
node server.js

echo.
pause
exit /b 0


:: =============================================================================
:INSTALL_NODE
set INSTALL_RESULT=0
set "NODE_MSI=%TEMP%\nodejs_lts_installer.msi"
set "NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi"

echo  [1/3] Chuan bi tai Node.js v22 LTS...

set "PS1=%TEMP%\dl_node.ps1"
(
echo $ProgressPreference = 'SilentlyContinue'
echo try {
echo     Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' -UseBasicParsing
echo     Write-Host '[OK] Tai xong'
echo     exit 0
echo } catch {
echo     Write-Host "[X] Loi: $($_.Exception.Message)"
echo     exit 1
echo }
) > "%PS1%"

echo  [2/3] Dang tai Node.js tu nodejs.org...
echo        (File ~30MB, co the mat vai phut)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set DL_ERR=%errorlevel%
del "%PS1%" > nul 2>&1

if %DL_ERR% neq 0 (
    echo  [X] Khong the tai Node.js. Kiem tra ket noi mang.
    set INSTALL_RESULT=1
    exit /b 1
)

if not exist "%NODE_MSI%" (
    echo  [X] File tai ve khong ton tai.
    set INSTALL_RESULT=1
    exit /b 1
)

echo  [3/3] Dang cai dat Node.js (co the mat 1-2 phut)...
msiexec /i "%NODE_MSI%" /quiet /norestart ADDLOCAL=ALL
set MSI_ERR=%errorlevel%
del "%NODE_MSI%" > nul 2>&1

if %MSI_ERR% neq 0 (
    echo  [X] Cai dat that bai (ma loi: %MSI_ERR%).
    echo      Thu chay lai bang quyen Administrator.
    set INSTALL_RESULT=1
    exit /b 1
)

set INSTALL_RESULT=0
exit /b 0
