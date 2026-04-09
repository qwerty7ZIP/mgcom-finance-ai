# MGCOM Finance AI - Web

Next.js 16 (App Router) приложение для внутренних данных MGCOM: таблицы, ИИ-чат, аналитика, диаграмма тендеров и админ-панель пользователей.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Local run

```bash
cd web
npm install
npm run dev
```

Адрес: [http://localhost:3000](http://localhost:3000)

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
YANDEX_GPT_API_KEY=...
YANDEX_GPT_FOLDER_ID=...
# optional
YANDEX_GPT_MODEL_URI=gpt://<folder-id>/yandexgpt/latest
```

Notes:

- Без Supabase приложение покажет пустые данные и сообщения о ненастроенном окружении.
- Без Yandex GPT переменных `/api/chat` работает в офлайн-режиме (заглушка).

## Routes

- `/` - таблицы + AI чат
- `/analytics` - аналитический дашборд
- `/diagram` - диаграмма тендеров
- `/tenders/[id]` - карточка тендера
- `/account` - личный кабинет
- `/admin` - админ-панель (только для `is_admin = true`)

## Access model

Права лежат в `auth.users.raw_user_meta_data` (Supabase):

```json
{
  "is_admin": true,
  "access": {
    "diagram": true,
    "tables": true,
    "analytics": true
  }
}
```

- Админ получает полный доступ ко всем разделам.
- Если у пользователя нет доступа ни к одному из разделов, показывается заглушка: `Попросите администратора о доступе`.
