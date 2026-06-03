# API и интеграции MGCOM Finance AI

## 1. Обзор API

Текущие серверные маршруты (`web/src/app/api`):

- `GET /api/data` - загрузка таблицы по имени.
- `POST /api/data` - загрузка по `tableRequest` (фильтры, сортировка, limit).
- `POST /api/chat` - обработка пользовательского запроса через YandexGPT.
- `GET /api/chats` - список сохраненных чатов пользователя.
- `GET /api/chats/[chatId]` - загрузка конкретного чата и его сообщений.
- `DELETE /api/chats/[chatId]` - удаление чата пользователя.
- `POST /api/chats/sync` - сохранение пары сообщений (user/ai) и создание чата при необходимости.
- `GET|POST|PATCH|DELETE /api/admin/users` - админское управление учетками и правами.

## 2. `/api/data`

### GET `/api/data?table=...`

- таблицы: `clients | contacts | tenders`;
- формат ответа: `{ columns, rows, error? }`.

### POST `/api/data`

Принимает `tableRequest`:

```json
{
  "tableRequest": {
    "table": "tenders",
    "filters": [
      { "field": "agency", "operator": "contains", "value": "MGCom" },
      { "field": "tender_status", "operator": "in", "value": ["Выигран тендер", "Размещается"] }
    ],
    "sort": { "field": "tender_start", "direction": "desc" },
    "limit": 100
  }
}
```

Поддерживаемые операторы в `dbTable.ts`:

- `eq`, `in`, `ilike`, `contains`, `gte`, `lte`, `gt`, `lt`.

## 3. `/api/chat`

### Назначение

Принимает текстовый запрос и историю, возвращает:

- `reply` - итоговый markdown-ответ AI.

### Важные правила текущей реализации

- двухэтапный pipeline:
  1) planner-модель формирует набор выборок (`requests`);
  2) analyst-модель формирует ответ только по полученным данным;
- серверная нормализация:
  - алиасы таблиц/полей;
  - whitelist разрешенных полей;
  - приведение фильтра агентства к `agency contains ...`;
  - автоподстановка `agency contains ...` при упоминании агентств группы;
  - автоподстановка `project contains ...` при распознавании проекта/направления;
  - для периодов по тендерам даты нормализуются к `tender_start`;
- для бюджетных запросов (`max`, `top-N`, `avg`, `share won`) используется детерминированный серверный расчет и расширенная выборка;
- в ответ добавляется диагностический блок с фактически примененными фильтрами/сортировкой/лимитом.

### Переменные окружения

- `YANDEX_GPT_API_KEY`
- `YANDEX_GPT_FOLDER_ID`
- `YANDEX_GPT_MODEL_URI` (опционально)

При отсутствии конфигурации возвращается ошибка конфигурации.

## 4. `/api/chats*` (история диалогов)

Требуют Bearer токен текущей пользовательской сессии.

- `GET /api/chats`:
  - возвращает чаты пользователя, отсортированные по `updated_at desc`.
- `GET /api/chats/[chatId]`:
  - возвращает метаданные чата и сообщения (`user|ai`) по возрастанию `created_at`.
- `DELETE /api/chats/[chatId]`:
  - удаляет чат пользователя (сообщения удаляются каскадно).
- `POST /api/chats/sync`:
  - принимает `{ chatId?, userMessage, aiReply }`;
  - если `chatId` отсутствует, создает чат (title из первого userMessage);
  - сохраняет пару сообщений user/ai.

## 5. `/api/admin/users`

Маршрут доступен только админу (Bearer токен текущей сессии + проверка `is_admin`).

- `GET` - список пользователей Supabase Auth.
- `POST` - создание пользователя:
  - `email`, `password`, `isAdmin`, `access`.
- `PATCH` - обновление прав и/или пароля:
  - `id`, `isAdmin`, `access`, `password`.
- `DELETE` - удаление пользователя:
  - `id` (есть защита от удаления самого себя).

Права хранятся в `user_metadata`:

```json
{
  "is_admin": false,
  "access": {
    "tables": true,
    "analytics": false,
    "diagram": true
  }
}
```

## 6. Интеграции

- `Supabase`:
  - Auth (sign in, session, admin user management),
  - Postgres tables (`clients`, `contacts`, `tenders`, `active_list`).
- `YandexGPT`:
  - endpoint: `https://llm.api.cloud.yandex.net/foundationModels/v1/completion`.

