@echo off
title Bulwark AI Server
color 0A
echo ==================================================
echo      STARTING BULWARK AI PROTECTION SERVER
echo ==================================================
echo.
echo [INFO] Starting Django Server...
echo.
echo [NOTE] DO NOT CLOSE THIS WINDOW while using the extension.
echo        You can minimize it.
echo.

cd ai_cyber_ext_pro
..\..\myworld\Scripts\python.exe manage.py runserver

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start.
    pause
)
