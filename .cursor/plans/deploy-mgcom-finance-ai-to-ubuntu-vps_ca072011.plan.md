---
name: deploy-mgcom-finance-ai-to-ubuntu-vps
overview: Настройка чистой Ubuntu 24.04 VPS для деплоя проекта mgcom-finance-ai с помощью Docker и docker-compose и запуск приложения на HTTP-порту.
todos:
  - id: install-docker
    content: Установить Docker и docker-compose на VPS (Ubuntu 24.04.2)
    status: pending
  - id: configure-ssh-gitea
    content: Настроить SSH-ключ на VPS и доступ к репозиторию Gitea
    status: pending
  - id: clone-project
    content: Клонировать репозиторий mgcom-finance-ai в /opt/mgcom/mgcom-finance-ai
    status: pending
  - id: setup-env-production
    content: Создать и заполнить файл web/.env.production с ключами Supabase и YandexGPT
    status: pending
  - id: create-docker-compose
    content: Создать docker-compose.yml в корне проекта для сервиса web на порту 3000 и с env_file
    status: pending
  - id: first-deploy
    content: Выполнить docker compose up -d --build и проверить доступность приложения по IP и порту
    status: pending
  - id: update-flow
    content: "Настроить процесс обновления: git pull + docker compose up -d --build при новых изменениях"
    status: pending
isProject: false
---

### Общая идея

- Установить Docker и docker-compose на чистую Ubuntu 24.04.2.
- Настроить SSH-доступ к Gitea, чтобы VPS мог клонировать репозиторий.
- Клонировать проект в директорию, где будем его держать (например, `/opt/mgcom-finance-ai`).
- Создать `.env.production` с нужными ключами Supabase и YandexGPT.
- Добавить `docker-compose.yml`, который собирает образ из `web/Dockerfile` и прокидывает переменные окружения.
- Запустить приложение через `docker compose up -d --build` и проверить, что оно доступно по IP и порту.

### 1. Базовая подготовка сервера

1. **Обновление пакетов и базовые утилиты**
  - Команды:

```bash
     sudo apt update && sudo apt upgrade -y
     sudo apt install -y git ca-certificates curl ufw
     

```

1. **(Опционально) Настроить firewall UFW**
  - Разрешить SSH и HTTP (и HTTPS на будущее):

```bash
     sudo ufw allow OpenSSH
     sudo ufw allow 80/tcp
     sudo ufw allow 3000/tcp   # если хочешь тестировать по 3000 порту
     sudo ufw enable
     sudo ufw status
     

```

### 2. Установка Docker и docker-compose

1. **Официальный репозиторий Docker**
  - Удалить возможные старые версии:

```bash
     sudo apt remove -y docker docker-engine docker.io containerd runc || true
     

```

- Настроить репозиторий Docker:

```bash
     sudo install -m 0755 -d /etc/apt/keyrings
     curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --yes --dearmor -o /etc/apt/keyrings/docker.gpg
     echo \
       "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
       $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
       sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

     sudo apt update
     sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
     

```

1. **Добавить текущего пользователя в группу docker**
  - Чтобы запускать Docker без `sudo` (после этого нужно перелогиниться):

```bash
     sudo usermod -aG docker $USER
     newgrp docker
     docker ps
     

```

### 3. Настройка доступа к репозиторию Gitea

1. **Создать SSH-ключ на VPS (если ещё нет)**
  - Команда (оставить passphrase пустой, если не нужен):

```bash
     ssh-keygen -t ed25519 -C "vps-mgcom" -f ~/.ssh/id_ed25519
     

```

1. **Скопировать публичный ключ и добавить в Gitea**
  - Показать ключ:

```bash
     cat ~/.ssh/id_ed25519.pub
     

```

- В Gitea: Settings → SSH Keys (или Deploy Keys для репозитория) → добавить этот ключ с правами Read/Write (или хотя бы Read).

1. **Проверить SSH-доступ к Gitea**
  - Команда:

```bash
     ssh -T git@gitea.mgcom.ru -p 2222
     

```

- Должно показать приветствие от Gitea без ошибок прав.

### 4. Клонирование проекта на VPS

1. **Выбрать директорию для проекта**
  - Например `/opt`:

```bash
     sudo mkdir -p /opt/mgcom
     sudo chown $USER:$USER /opt/mgcom
     cd /opt/mgcom
     

```

1. **Клонировать репозиторий по SSH**
  - Команда (порт 2222, как в логах докплоя):

```bash
     git clone "ssh://git@gitea.mgcom.ru:2222/NewBiz/mgcom-finance-ai.git"
     cd mgcom-finance-ai
     

```

### 5. Подготовка окружения (.env.production)

1. **Создать `.env.production` в папке `web`**
  - Перейти в `web`:

```bash
     cd /opt/mgcom/mgcom-finance-ai/web
     

```

- Создать файл (можно скопировать содержимое из твоего локального `.env.local`):

```bash
     nano .env.production
     

```

- Пример содержимого (без пробелов вокруг `=`):

```env
     YANDEX_GPT_API_KEY=...твой_ключ...
     YANDEX_GPT_FOLDER_ID=...твой_folder_id...
     NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
     SUPABASE_SERVICE_ROLE_KEY=...твой_service_role_key...
     NEXT_PUBLIC_SUPABASE_ANON_KEY=...твой_anon_key...
     

```

- Сохранить файл (`Ctrl+O`, Enter, `Ctrl+X`).

1. **Проверить, что файл не попадёт в git**
  - Убедиться, что `.env.production` не закоммичен (обычно `.env`* уже в `.gitignore`, но можно проверить):

```bash
     git status
     

```

### 6. docker-compose.yml для запуска приложения

1. **Создать `docker-compose.yml` в корне проекта**
  - Файл `/opt/mgcom/mgcom-finance-ai/docker-compose.yml` с содержимым:

```yaml
     version: "3.9"

     services:
       web:
         build:
           context: ./web
           dockerfile: Dockerfile
         container_name: mgcom-web
         restart: always
         env_file:
           - ./web/.env.production
         ports:
           - "3000:3000"   # или "80:3000" если хочешь сразу на 80 порту
     

```

1. **Пояснение**
  - `build.context: ./web` — использует уже существующий `web/Dockerfile`.
  - `env_file` — подсовывает в контейнер все переменные из `.env.production`, чтобы `supabaseServer` и `/api/chat` видели Supabase и Yandex.
  - `ports` — прокидывает порт контейнера 3000 на порт 3000 хоста (подойдёшь по `http://IP:3000`).

### 7. Первый запуск

1. **Собрать и запустить контейнеры**
  - Из корня проекта (`/opt/mgcom/mgcom-finance-ai`):

```bash
     docker compose up -d --build
     

```

1. **Проверить статус**
  - Список контейнеров:

```bash
     docker ps
     

```

- Логи приложения:

```bash
     docker logs -f mgcom-web
     

```

1. **Проверка в браузере**
  - Открыть в браузере: `http://IP_ТВОЕГО_VPS:3000`.
  - Убедиться, что:
    - главная страница открывается,
    - вкладки «Тендеры/Клиенты/Контакты» не показывают красную ошибку про Supabase,
    - чат/нейронка Яндекса отвечает (если ключи верные и есть доступ к API).

### 8. Обновление проекта в будущем

1. **Подтянуть последние изменения из Gitea**
  - На сервере:

```bash
     cd /opt/mgcom/mgcom-finance-ai
     git pull
     

```

1. **Пересобрать и перезапустить контейнер**
  - Команда:

```bash
     docker compose up -d --build
     

```

1. **Остановка, если нужно**
  - Остановить и удалить контейнеры:

```bash
     docker compose down
     

```

Если позже захочешь повесить домен и HTTPS (через Caddy или Nginx в отдельном контейнере), можно будет добавить ещё один сервис в `docker-compose.yml`, который будет проксировать `80/443` → `web:3000`.