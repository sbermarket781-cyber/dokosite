@echo off
chcp 65001 >nul
title Alexei Docs — Запуск

echo ============================================
echo    Alexei Docs — Установка и запуск
echo ============================================
echo.

:: Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установлен!
    echo Скачайте Node.js 20+ с https://nodejs.org
    pause
    exit /b 1
)

echo [1/5] Версия Node.js:
node --version
echo.

:: Установка зависимостей
echo [2/5] Установка зависимостей...
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить зависимости
    pause
    exit /b 1
)
echo.

:: Генерация Prisma Client
echo [3/5] Генерация Prisma Client...
call npx prisma generate
echo.

:: Создание .env если нет
if not exist .env (
    echo [4/5] Создание .env из .env.example...
    copy .env.example .env
) else (
    echo [4/5] .env уже существует, пропускаю...
)
echo.

:: Инициализация базы данных
echo [5/5] Инициализация базы данных...
echo ВНИМАНИЕ: Убедитесь, что PostgreSQL запущен и доступен!
echo Если используете Docker, сначала запустите: docker compose up db -d
echo.
set /p INIT_DB="Инициализировать базу данных сейчас? (y/n): "
if /i "%INIT_DB%"=="y" (
    call npx prisma db push
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось подключиться к базе данных
        echo Проверьте настройки в .env и убедитесь что PostgreSQL запущен
        pause
        exit /b 1
    )
    echo.
    echo Заполнение тестовыми данными...
    call npx tsx prisma/seed.ts
    echo.
)

echo ============================================
echo    Запуск сервера разработки...
echo ============================================
echo.
echo Сайт будет доступен по адресу: http://localhost:3000
echo.
echo Учётные данные:
echo   Админ:    login: admin    / password: admin123
echo   Менеджер: login: manager  / password: manager123
echo.
echo Для остановки нажмите Ctrl+C
echo ============================================
echo.

call npm run dev

pause
