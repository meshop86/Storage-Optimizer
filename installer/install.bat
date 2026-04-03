@echo off
title Storage Optimizer - Setup
cd /d "%~dp0"

echo ============================================
echo   Storage Optimizer v2.0.0 - Cai dat
echo ============================================
echo.

:: --- [1/3] Cai npm dependencies ---
echo [1/3] Kiem tra Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo CANH BAO: Node.js chua duoc cai.
    echo Vui long cai tai: https://nodejs.org  roi chay lai file nay.
    pause
    exit /b 1
)
echo Node.js: OK

echo.
echo [2/3] Cai dat dependencies (co the mat 30-60 giay lan dau)...
call npm install --omit=dev
if %errorlevel% neq 0 (
    echo LOI: npm install that bai. Kiem tra ket noi mang va thu lai.
    pause
    exit /b 1
)
echo Dependencies: OK

:: --- [2/3] Tao shortcuts ---
echo.
echo [3/3] Tao shortcuts...

set "INSTALL_DIR=%~dp0"
set "DESKTOP=%USERPROFILE%\Desktop"
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Storage Optimizer"

:: Desktop shortcut
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\Storage Optimizer.lnk'); $s.TargetPath = '%INSTALL_DIR%start.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'Storage Optimizer'; $s.Save()" 2>nul

:: Start Menu shortcut
if not exist "%STARTMENU%" mkdir "%STARTMENU%"
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTMENU%\Storage Optimizer.lnk'); $s.TargetPath = '%INSTALL_DIR%start.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()" 2>nul

:: Tao file uninstall.bat
(
  echo @echo off
  echo title Go cai dat Storage Optimizer
  echo echo Dang go cai dat...
  echo del /f /q "%DESKTOP%\Storage Optimizer.lnk" 2^>nul
  echo rmdir /s /q "%STARTMENU%" 2^>nul
  echo rmdir /s /q "%INSTALL_DIR%node_modules" 2^>nul
  echo echo Hoan tat. Thu muc go cai dat: %INSTALL_DIR%
  echo pause
) > "%INSTALL_DIR%uninstall.bat"

echo.
echo ============================================
echo   Cai dat thanh cong!
echo   Truy cap: http://localhost:7788
echo ============================================
echo.
echo Nhan phim bat ky de khoi dong app...
pause >nul
start "" "%INSTALL_DIR%start.bat"
