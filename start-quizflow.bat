@echo off
echo ========================================
echo   ЗАПУСК QUIZFLOW PLATFORM
echo ========================================
echo.

echo 1. Запуск SQLite Backend (порт 5000)...
start cmd /k "cd /d %~dp0 && node server-sqlite.js"

timeout /t 3 /nobreak >nul

echo.
echo 2. Запуск Frontend сервера (порт 8000)...
start cmd /k "cd /d %~dp0 && python python-server.py"

echo.
echo ========================================
echo   СЕРВИСЫ ЗАПУЩЕНЫ:
echo    Backend API: http://localhost:5000
echo    Frontend:    http://localhost:8000
echo ========================================
echo.
echo Откройте браузер и перейдите по адресу:
echo   http://localhost:8000
echo.
pause
