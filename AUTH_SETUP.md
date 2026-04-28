# Авторизация через Telegram: что нужно настроить

## 1. Render / сервер

Добавь или проверь переменные окружения:

```text
BOT_TOKEN=токен_бота
BOT_USERNAME=baraholka_miniapp_bot
WEB_APP_URL=https://твой-домен.vercel.app
AUTH_SESSION_TTL_MS=2592000000
AUTH_MAX_AGE_SECONDS=604800
```

`AUTH_SESSION_TTL_MS` — срок сайта-сессии, по умолчанию 30 дней.  
`AUTH_MAX_AGE_SECONDS` — максимальный возраст Telegram-подписи, по умолчанию 7 дней.

## 2. Vercel / клиент

Добавь переменные окружения:

```text
VITE_API_BASE_URL=https://твой-render-сервер.onrender.com
VITE_BOT_USERNAME=baraholka_miniapp_bot
```

После изменения переменных нужно заново задеплоить проект.

## 3. BotFather для входа на сайте

Для Telegram Login Widget обязательно привяжи домен сайта к боту:

```text
/setdomain
```

Выбери бота и укажи домен Vercel без `https://`, например:

```text
miniapp-9vf5.vercel.app
```

Если будет свой домен, потом нужно заменить на него.

## 4. Что появилось в проекте

- Mini App теперь отправляет `Telegram.WebApp.initData` на сервер.
- Сервер проверяет подпись Telegram и только после этого создаёт/обновляет `users/{telegramId}`.
- Если пользователь открывает сайт вне Telegram, появляется экран входа через Telegram Login Widget.
- После входа сайт сохраняет сессию в `localStorage` и при следующем открытии восстанавливает профиль.
- Все аккаунты Mini App и сайта сходятся в один документ `users/{telegramId}`.

## 5. Новые коллекции Firestore

```text
user_sessions
```

В ней хранятся хэши сессий сайта. Сами токены в Firestore не сохраняются в открытом виде.
