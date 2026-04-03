@echo off
title Build Storage Optimizer - WinRAR SFX
cd /d "%~dp0.."

echo ============================================
echo   Build SFX Installer bang WinRAR
echo ============================================
echo.

:: --- Tim WinRAR ---
set WINRAR=
if exist "C:\Program Files\WinRAR\WinRAR.exe"       set "WINRAR=C:\Program Files\WinRAR\WinRAR.exe"
if exist "C:\Program Files (x86)\WinRAR\WinRAR.exe" set "WINRAR=C:\Program Files (x86)\WinRAR\WinRAR.exe"

if "%WINRAR%"=="" (
    echo LOI: Khong tim thay WinRAR!
    echo Vui long cai WinRAR tai: https://rarlab.com
    pause
    exit /b 1
)
echo Tim thay WinRAR: %WINRAR%

:: --- Tao thu muc output ---
if not exist "installer\output" mkdir "installer\output"

:: --- Copy install.bat vao root de goi vao archive ---
copy /y "installer\install.bat" "install.bat" >nul

:: --- Xoa file cu neu co ---
if exist "installer\output\StorageOptimizer-Setup-v2.0.0.exe" (
    del "installer\output\StorageOptimizer-Setup-v2.0.0.exe"
)

:: --- Dong goi ---
echo Dang dong goi files...

:: Goi tung file rieng le de giu dung cau truc thu muc
"%WINRAR%" a -sfx -z"installer\sfx_config.txt" -r ^
  "installer\output\StorageOptimizer-Setup-v2.0.0.exe" ^
  server.js ^
  license.js ^
  package.json ^
  start.bat ^
  install.bat

:: Them thu muc public (giu nguyen cau truc public\)
"%WINRAR%" a "installer\output\StorageOptimizer-Setup-v2.0.0.exe" public

:: Them tray.js neu ton tai
if exist tray.js (
    "%WINRAR%" a "installer\output\StorageOptimizer-Setup-v2.0.0.exe" tray.js
)

:: --- Xoa file tam ---
del "install.bat" >nul 2>&1

:: --- Ket qua ---
if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo   THANH CONG!
    echo   File: installer\output\StorageOptimizer-Setup-v2.0.0.exe
    echo ============================================
    explorer "installer\output"
) else (
    echo.
    echo LOI khi tao SFX. Ma loi: %errorlevel%
)

pause
