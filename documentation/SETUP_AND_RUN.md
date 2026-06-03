# Установка и запуск MGCOM Finance AI

## 1. Требования

- Node.js `>= 20.9.0` (для Next.js 16)
- npm
- доступ к Supabase и Yandex Cloud (для полного режима)

## 2. Установка

```bash
cd web
npm install
```

## 3. Переменные окружения

Создайте `web/.env.local` (или используйте `.env.production` для Docker):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
YANDEX_GPT_API_KEY=...
YANDEX_GPT_FOLDER_ID=...
# optional
YANDEX_GPT_MODEL_URI=gpt://<folder-id>/yandexgpt/latest
```

Пояснение:

- `NEXT_PUBLIC_*` нужны браузерной авторизации;
- `SUPABASE_SERVICE_ROLE_KEY` нужен серверным API (`/api/data`, `/api/admin/users`);
- `SUPABASE_SERVICE_ROLE_KEY` также нужен API истории чатов (`/api/chats*`);
- без Yandex-переменных `/api/chat` вернет ошибку конфигурации.

## 4. Локальный запуск

```bash
cd web
npm run dev
```

Откройте `http://localhost:3000`.

## 5. Проверка прод-сборки

```bash
cd web
npm run build
npm run start
```

## 6. Docker (базовый пример)

```bash
docker build -t mgcom-finance-ai-web ./web
docker run --rm -p 3000:3000 --env-file web/.env.production mgcom-finance-ai-web
```

Важно: в Docker обязательно передавать env-файл, иначе не будет подключения к Supabase/Yandex.

## 7. Быстрый деплой на VPS (docker compose)

1. Установить Docker + Docker Compose plugin.
2. Склонировать репозиторий.
3. Подготовить env-файл на сервере.
4. Запустить:

```bash
docker compose up -d --build
```

5. Проверить:

```bash
docker compose ps
docker compose logs -f
```

## 8. Первичная выдача админа

После первого деплоя выдайте `is_admin=true` хотя бы одной учетке в Supabase Auth (через UI Users или SQL), иначе доступ к `/admin` будет недоступен.

## 9. SQL для истории чатов

Перед использованием сохранения диалогов выполните SQL-скрипт:

```bash
web/supabase/chat_history.sql
```

Он создает таблицы:

- `ai_chats`
- `ai_chat_messages`

Если скрипт не применен, UI переключится в локальный режим хранения истории (`localStorage`), а серверные эндпоинты `/api/chats*` будут возвращать ошибку.


Поднять проект на сервере ASAP:
1. На VPS перейти в путь /opt/mgcom/mgcom-finance-ai командой **cd /opt/mgcom/mgcom-finance-ai**
2. Проверить запущены ли какие-то контейнеры в docker compose командой **docker compose ps -a**
3. Если контейнер запущен, остановить его командой **docker compose stop**
4. Запуллить последнюю версию проекта с Gitea MGCom командой **git pull**
5. Запустить сборку проекта командой **docker compose up -d --build**
6. Проект запущен. На момент написания документации он не прикреплен к домену и висит на айпишнике VPS