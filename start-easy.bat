@echo off
echo Запуск QuizFlow Platform...
echo.

REM Создаем папки если нет
if not exist uploads mkdir uploads
if not exist src mkdir src

REM Копируем файлы если нужно
if not exist lessons.json echo [] > lessons.json

REM Запускаем простой сервер
node simple-backend.js