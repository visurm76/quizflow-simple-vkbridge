// Этот скрипт автоматически исправит api.js
const fs = require('fs');
const path = require('path');

const apiJsPath = path.join(__dirname, 'src', 'api.js');

if (fs.existsSync(apiJsPath)) {
    let content = fs.readFileSync(apiJsPath, 'utf8');
    
    // Заменяем порт 3001 на 5000
    content = content.replace(
        /constructor\(baseURL = 'http:\/\/localhost:3001\/api'\)/,
        "constructor(baseURL = 'http://localhost:5000/api')"
    );
    
    // Альтернативная замена
    content = content.replace(
        /'http:\/\/localhost:3001\/api'/g,
        "'http://localhost:5000/api'"
    );
    
    fs.writeFileSync(apiJsPath, content, 'utf8');
    console.log('✅ api.js исправлен (порт 3001 → 5000)');
} else {
    console.log('❌ Файл api.js не найден в папке src/');
}

// Создаем bat файл для удобного запуска
const batContent = `@echo off
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
`;

fs.writeFileSync('start-quizflow.bat', batContent, 'utf8');
console.log('✅ Создан файл start-quizflow.bat');