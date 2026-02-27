# One Price Mini CRM

Простой запуск Next.js + Telegram bot для Mini CRM.

## Запуск с нуля

1) Создать `.env`:

```bash
cp .env.example .env
```

2) Вставить значения:
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_ID`

3) Поднять PostgreSQL:

```bash
docker compose up -d
```

4) Установить зависимости:

```bash
npm i
```

5) Применить миграции:

```bash
npm run prisma:migrate
```

6) Запустить сидер:

```bash
npm run db:seed
```

7) Запустить веб:

```bash
npm run dev:web
```

8) Запустить бота (в отдельном терминале):

```bash
npm run bot:dev
```

9) Открыть бота в Telegram:
- отправить `/start`
- нажать кнопку `Открыть предложение`

## Важно
- Веб всегда поднимается на `http://localhost:4000`.
- Кнопка бота открывает `WEBAPP_URL` из `.env`.
- Уведомления о новом комментарии/вложении уходят на `ADMIN_TELEGRAM_ID`.

## Деплой на Railway (web + bot)

### 1. Общая схема

Репозиторий один, но на Railway создаются **два сервиса**:

- веб-сервис (Next.js)
- worker-сервис для Telegram-бота (Telegraf long polling, без вебхуков)

### 2. Веб-сервис (Next.js)

- **Build Command**: `npm run build`
- **Start Command**: `npm run start:web`
- Переменные окружения (Web):
  - `DATABASE_URL`
  - `WEBAPP_URL` (публичный URL веб-приложения на Railway/Cloudflare)
  - другие, которые нужны вебу/БД.

### 3. Bot worker (Telegraf long polling)

Создать второй сервис в том же проекте Railway, привязанный к этому же Git-репозиторию.

- **Build Command**: `npm run bot:build`
- **Start Command**: `npm run bot:start`

Порты для этого сервиса не нужны (он не принимает HTTP-трафик, только long polling в Telegram API).

Переменные окружения (Bot):

- `TELEGRAM_BOT_TOKEN` — токен бота из BotFather.
- `ADMIN_TELEGRAM_ID` — ваш Telegram ID (для админских уведомлений).
- `ADMIN_KEY` — секрет для админских API-запросов.
- `WEBAPP_URL` — публичный URL веб-приложения (тот же, что использует клиент; нужен для кнопки `Открыть` и ссылок).

Важно:

- Bot worker использует `bot/index.ts`, который в проде компилируется в `dist/bot/index.js` с помощью `npm run bot:build`.
- Никаких webhook-конфигураций на Railway не нужно — бот работает только через `bot.launch()` (long polling).
