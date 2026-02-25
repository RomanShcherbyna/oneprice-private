# SPEC: Mini CRM for 1 Client (Telegram Mini App)
# SPEC: Mini CRM for 1 Client (Telegram Mini App)

## Actors
- Client (1 Telegram user)
- Admin (менеджер/владелец)

## Client capabilities
- Открыть Mini App из Telegram бота.
- Видеть список объектов (cards).
- В каждой карточке:
  - фото галерея (свайп, зум),
  - блок параметров: локация, метраж, ставка, сервис, итог/мес (если задан), срок,
  - описание,
  - список документов (скачать/открыть).
- Оставить комментарий к объекту:
  - текст (опционально),
  - вложения (ОБЯЗАТЕЛЬНО поддержать: файл/скрин/фото). Вложения могут быть 0..N.
- Видеть историю своих комментариев по каждому объекту.

## Admin capabilities
- Логин: admin key.
- CRUD объектов:
  - title, location, area_m2, rent_rate, service_rate, currency, monthly_total (optional), term, description
  - visible_to_client boolean
- Управление фото: upload, reorder, delete
- Управление документами: upload, delete
- Просмотр комментариев клиента по объектам + вложения (скачать)
- Получать уведомления в Telegram при новом комментарии или вложении.

## Explicit exclusions
- No statuses for properties.
- No manager replies inside system (no chat).
- No multiple clients.

## UI (Client)
Single page:
- List of property cards
- Each card contains:
  - PhotoCarousel
  - ParametersBlock
  - DocsList
  - CommentsList
  - CommentComposer (text + attachments)

## UI (Admin)
- Properties list
- Property editor page
- Attachments management
- Comments viewer per property

## Допущения реализации
1. Авторизация клиента реализована через Telegram user id (`CLIENT_TELEGRAM_ID`) в header/query.
2. Вложения комментариев допускают 0..N файлов, но поле "скрепка" всегда присутствует в UI.
3. Файлы хранятся локально в `/uploads`, доступ отдается через `/api/files/[...path]`.
4. Уведомления админу отправляются через Telegram Bot HTTP API при создании комментария.
## Actors
- Client (1 Telegram user)
- Admin (менеджер/владелец)

## Client capabilities
- Открыть Mini App из Telegram бота.
- Видеть список объектов (cards).
- В каждой карточке:
  - фото галерея (свайп, зум),
  - блок параметров: локация, метраж, ставка, сервис, итог/мес (если задан), срок,
  - описание,
  - список документов (скачать/открыть).
- Оставить комментарий к объекту:
  - текст (опционально),
  - вложения (ОБЯЗАТЕЛЬНО поддержать: файл/скрин/фото). Вложения могут быть 0..N (разрешить без ограничений кроме лимита).
- Видеть историю своих комментариев по каждому объекту.

## Admin capabilities
- Логин: простой admin key / basic auth / отдельный admin Telegram id.
- CRUD объектов:
  - title, location, area_m2, rent_rate, service_rate, currency, monthly_total (optional), term (e.g. 5 years), description
  - visible_to_client boolean
- Управление фото: upload, reorder, delete
- Управление документами: upload, delete
- Просмотр комментариев клиента по объектам + вложения (скачать)
- Получать уведомления в Telegram при новом комментарии или вложении.

## Explicit exclusions
- No statuses for properties.
- No manager replies inside system (no chat).
- No multiple clients.

## UI (Client)
Single page:
- List of property cards (infinite scroll or pagination)
- Each card contains:
  - PhotoCarousel
  - ParametersBlock
  - DocsList
  - CommentsList
  - CommentComposer (text + attachments)

## UI (Admin)
- Properties list
- Property editor page/modal
- Attachments management
- Comments viewer per property