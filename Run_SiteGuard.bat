@echo off
title Site Guard Launcher
echo ==========================================
echo   Starting Site Guard AI Backend...
echo ==========================================

cd /d "%~dp0"

REM 1. Activate Virtual Environment
if exist "myworld\Scripts\activate.bat" (
    echo Activating 'myworld' environment...
    call "myworld\Scripts\activate.bat"
) else if exist "BULWARK\Scripts\activate.bat" (
    echo Activating 'BULWARK' environment...
    call "BULWARK\Scripts\activate.bat"
) else (
    echo No virtual environment found! Trying global python...
)

REM 2. Start Django Server in background
echo Starting Django Server...
start "SiteGuard AI Server" /min cmd /k "python ai_cyber_ext_pro/manage.py runserver"

REM 3. Open Chrome after a short delay
echo Waiting for server to initialize...
timeout /t 3 >nul
echo Opening Chrome...
start chrome "chrome://extensions" "http://127.0.0.1:8000"

echo ==========================================
echo   System Active! You can close this window.
echo ==========================================
timeout /t 5
exit
