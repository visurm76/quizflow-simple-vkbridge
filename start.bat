@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   ЗАПУСК QUIZFLOW PLATFORM
echo ============================================
echo.

echo 📦 Проверяем Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не установлен!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 📁 Проверяем файлы проекта...
if not exist index.html (
    echo ❌ index.html не найден!
    echo Создаю базовый index.html...
    
    echo ^<!DOCTYPE html^> > index.html
    echo ^<html^> >> index.html
    echo ^<head^> >> index.html
    echo     ^<title^>QuizFlow Platform^</title^> >> index.html
    echo ^</head^> >> index.html
    echo ^<body^> >> index.html
    echo     ^<h1^>🎓 QuizFlow Platform^</h1^> >> index.html
    echo     ^<p^>Сервер запущен!^</p^> >> index.html
    echo ^</body^> >> index.html
    echo ^</html^> >> index.html
)

if not exist src mkdir src
if not exist uploads mkdir uploads

echo.
echo 📦 Проверяем зависимости Node.js...
if not exist package.json (
    echo {
    echo   "name": "quizflow-platform",
    echo   "version": "1.0.0",
    echo   "dependencies": {
    echo     "express": "^4.18.2",
    echo     "sqlite3": "^5.1.6",
    echo     "cors": "^2.8.5",
    echo     "multer": "^1.4.5-lts.1"
    echo   }
    echo } > package.json
)

if not exist node_modules (
    echo 📥 Устанавливаем зависимости...
    npm install express sqlite3 cors multer
)

echo.
echo 🚀 Запускаем сервер...
echo.
echo ============================================
echo   СЕРВЕР БУДЕТ ДОСТУПЕН ПО АДРЕСУ:
echo        http://localhost:3000
echo ============================================
echo.
echo ⚡ Нажмите Ctrl+C для остановки
echo.

node quizflow-server.js

pause