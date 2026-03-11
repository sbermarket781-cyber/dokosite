@echo off
chcp 65001 >nul
title Alexei Docs — Запуск через Docker

echo ============================================
echo    Alexei Docs — Docker Запуск
echo ============================================
echo.

:: Проверка Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Docker не установлен!
    echo.
    echo Скачайте Docker Desktop с https://www.docker.com/products/docker-desktop
    echo После установки перезагрузите компьютер и запустите этот скрипт снова.
    echo.
    pause
    exit /b 1
)

:: Проверка что Docker запущен
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Docker не запущен!
    echo Запустите Docker Desktop и дождитесь пока он полностью загрузится.
    pause
    exit /b 1
)

echo [OK] Docker найден и запущен
docker --version
echo.

:: Создание .env если нет
if not exist .env (
    echo Создание .env из .env.example...
    copy .env.example .env
)

echo ============================================
echo    Сборка и запуск контейнеров...
echo ============================================
echo.
echo Это может занять несколько минут при первом запуске.
echo.

docker compose up --build -d
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось запустить контейнеры
    pause
    exit /b 1
)

echo.
echo Ожидание запуска базы данных (10 секунд)...
timeout /t 10 /nobreak >nul

:: Запуск миграций и seed
echo Инициализация базы данных...
docker compose exec app sh -c "npx prisma db push && npx tsx prisma/seed.ts"

echo.
echo ============================================
echo    Alexei Docs успешно запущен!
echo ============================================
echo.
echo Сайт доступен: http://localhost:3000
echo.
echo Учётные данные:
echo   Админ:    login: admin    / password: admin123
echo   Менеджер: login: manager  / password: manager123
echo.
echo Команды управления:
echo   Остановить:   docker compose down
echo   Логи:         docker compose logs -f app
echo   Перезапуск:   docker compose restart
echo   Полная очистка: docker compose down -v
echo.
pause
