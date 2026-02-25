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
