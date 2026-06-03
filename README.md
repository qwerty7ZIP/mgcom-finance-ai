# MGCOM Finance AI

Внутреннее web-приложение для работы с данными `clients`, `contacts`, `tenders` из Supabase, с ИИ-чатом (YandexGPT), аналитикой, диаграммой тендеров и админ-управлением доступами пользователей.

## Что есть в проекте

- `ИИ-ассистент` (`/`): чат с markdown-ответами, автоматической интерпретацией бизнес-правил и историей диалогов.
- `Аналитика`: блоки по тендерам, клиентам, контактам и менеджерам.
- `Диаграмма`: Gantt-представление тендеров с текущей датой, будущими тендерами и переходом в карточку.
- `Карточка тендера`: полная информация, ссылка в Planfix, индикатор активного клиента/каналов из `active_list`.
- `Админка`: создание/удаление пользователей, смена пароля, выдача прав:
  - `is_admin`;
  - доступы к разделам `diagram`, `tables` (в UI: `ИИ-ассистент`), `analytics`.

## Быстрый старт

```bash
cd web
npm install
npm run dev
```

Приложение поднимется на [http://localhost:3000](http://localhost:3000).

## Переменные окружения

Минимально для рабочего режима:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
YANDEX_GPT_API_KEY=...
YANDEX_GPT_FOLDER_ID=...
# опционально
YANDEX_GPT_MODEL_URI=gpt://<folder-id>/yandexgpt/latest
```

Если Yandex-переменные не заданы, `/api/chat` вернет ошибку конфигурации.

## Документация

Подробная документация находится в `documentation/`:

- `documentation/README.md` - навигация по документам.
- `documentation/ARCHITECTURE.md` - архитектура и потоки данных.
- `documentation/API_AND_INTEGRATIONS.md` - описание API и интеграций.
- `documentation/FRONTEND_UI.md` - страницы и компоненты UI.
- `documentation/DATA_MODEL.md` - таблицы и поля данных.
- `documentation/SETUP_AND_RUN.md` - запуск и деплой.
- `documentation/PLAN.md` - текущее состояние и roadmap.
