# Модель данных MGCOM Finance AI

## 1. Основные таблицы Supabase

Приложение работает с таблицами:

- `clients`
- `contacts`
- `tenders`
- `active_list` (используется в карточке тендера)

`/api/data` читает первые три таблицы напрямую, а `active_list` используется серверной страницей карточки тендера.

## 2. Ключевые поля (используемые в коде)

### `tenders`

- `id`, `id_pf`
- `client`, `project`
- `agency`, `manager`
- `tender_status`
- `tender_budget`
- `tender_start`, `tender_end`, `tender_dl`

### `contacts`

- `name`, `company`, `phone`, `e-mail`, `work_position` (+ дополнительные)

### `clients`

- зависит от текущей схемы БД; таблица выводится как универсальный набор колонок.

### `active_list`

- `client`, `agency`, `active`
- флаги каналов:
  - `performance`, `context`, `target`, `media`, `olv`, `mobile`, `programmatic`,
  - `marketplace`, `cpa`, `in-app` (и совместимые варианты имени),
  - `orm`, `seo`, `influence`, `creative`.

## 3. Формат `tableRequest`

```ts
type TableRequest = {
  table?: "clients" | "contacts" | "tenders";
  filters?: { field: string; operator: string; value: unknown }[];
  sort?: { field: string; direction?: "asc" | "desc" } | null;
  limit?: number;
  description?: string;
  columns?: string[];
};
```

Поддерживаемые сервером операторы:

- `eq`
- `in`
- `ilike`
- `contains` (как `ilike`)
- `gte`, `lte`, `gt`, `lt`

## 4. Ограничения и лимиты

- серверный лимит выборки: `DEFAULT_LIMIT = 15000` (в `dbTable.ts`);
- данные читаются странично (`range`) с шагом `SUPABASE_PAGE_SIZE = 1000`.

## 5. Права пользователей (метаданные Auth)

Права лежат в `auth.users.raw_user_meta_data`:

```json
{
  "is_admin": false,
  "access": {
    "tables": true,
    "analytics": true,
    "diagram": false
  }
}
```

- при `is_admin = true` система дает полный доступ;
- если `access` не задан, в текущей реализации действует fallback на полный доступ для обратной совместимости старых учеток.

