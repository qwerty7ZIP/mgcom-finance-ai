# Архитектура MGCOM Finance AI

## 1. Общая схема

Проект - единое full-stack приложение на `Next.js` (App Router) в директории `web`.

- UI и API находятся в одном кодовом дереве.
- Данные хранятся в `Supabase PostgreSQL`.
- AI-обработка запросов идет через `YandexGPT` в `/api/chat`.
- Авторизация и пользователи - Supabase Auth.

## 2. Ключевые слои

### Фронтенд

- страницы: `/`, `/analytics`, `/diagram`, `/tenders/[id]`, `/account`, `/admin`, `/auth/sign-in`;
- общая защита через `ProtectedLayout`:
  - проверка авторизации;
  - проверка прав по разделам;
  - заглушка `Попросите администратора о доступе`, если прав нет совсем.

### API

- `/api/data` - чтение таблиц и выборок по `tableRequest`;
- `/api/chat` - AI-пайплайн (planner + analyst) с серверной нормализацией и markdown-ответом;
- `/api/chats`, `/api/chats/[chatId]`, `/api/chats/sync` - хранение и управление историей диалогов;
- `/api/admin/users` - админ-операции с учетками (CRUD, права, пароли).

### Данные

- рабочие таблицы: `clients`, `contacts`, `tenders`, `active_list`;
- доступы пользователей хранятся в `auth.users.raw_user_meta_data`.

## 3. Поток данных в разделе ИИ-ассистент (`/`)

1. UI (`ChatPanel`) отправляет вопрос в `/api/chat`.
2. Planner строит план выборок по таблицам БД.
3. Сервер выполняет выборки через `getDbRowsByRequest` и собирает evidence.
4. Analyst формирует итоговый markdown-ответ строго по evidence.
5. UI рендерит ответ (включая markdown-таблицы) и сохраняет диалог:
   - основной путь: `/api/chats/sync`;
   - fallback: localStorage при недоступности `/api/chats*`.

## 4. Поток данных в Диаграмме и Карточке

- `TendersGantt` загружает `tenders` через `/api/data`.
- Строятся:
  - текущие тендеры по `tender_start` -> `tender_end` (или fallback `tender_dl`);
  - будущие тендеры (`futureStart = start + 1 год`, `futureEnd = futureStart + 3 недели`).
- Клик по плашке/названию ведет на `/tenders/[id]`.
- Карточка подтягивает тендер и обогащает бейджами активного клиента/каналов из `active_list`.

## 5. Модель прав

Реализована в `src/lib/access.ts`:

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

- `is_admin = true` => полный доступ.
- обычный пользователь видит только разрешенные разделы.
- `AppHeader` скрывает недоступные пункты меню.

## 6. Структура `web/src` (основное)

- `app/`:
  - страницы (`page.tsx`, `analytics/page.tsx`, `diagram/page.tsx`, `admin/page.tsx`, `tenders/[id]/page.tsx`);
  - API (`api/data/route.ts`, `api/chat/route.ts`, `api/chats/*`, `api/admin/users/route.ts`).
- `components/`:
  - `Dashboard`, `ChatPanel`, `DataTable` (используется в других/legacy сценариях);
  - `analytics/*`, `diagram/TendersGantt`, `admin/AdminPanel`;
  - `AppHeader`, `ProtectedLayout`, `ThemeToggle`.
- `lib/`:
  - `dbTable`, `access`, `supabaseBrowser`, `supabaseServer`, `buildTableFromRecords`.

## 7. Нефункциональные характеристики

- рассчитано на внутреннее использование;
- выборка данных ограничивается серверным лимитом (`DEFAULT_LIMIT` в `dbTable.ts`);
- критичные ключи лежат в env-переменных;
- административные операции выполняются только через `service role key` на сервере.

