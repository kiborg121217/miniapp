# Telegram OpenID Connect: настройка авторизации сайта

Внутри Telegram Mini App авторизация продолжает работать через `Telegram.WebApp.initData`.
Для обычного сайта в браузере теперь используется новый Telegram OpenID Connect.

## 1. BotFather

Открой `@BotFather` → твой бот → `Bot Settings` → `Web Login`.

Добавь:

### Redirect URIs

```txt
https://miniapp-9vf5.vercel.app/auth/callback
```

### Trusted Origins

```txt
https://miniapp-9vf5.vercel.app
```

С этого же экрана скопируй:

- `Client ID`
- `Client Secret`

`Client Secret` никому не отправляй и не добавляй во frontend/Vercel.

## 2. Render: переменные backend

В Render → backend service → `Environment` добавь:

```env
BOT_TOKEN=твой_токен_бота
BOT_USERNAME=baraholka_miniapp_bot
WEB_APP_URL=https://miniapp-9vf5.vercel.app
TELEGRAM_OIDC_CLIENT_ID=твой_Client_ID_из_BotFather
TELEGRAM_OIDC_CLIENT_SECRET=твой_Client_Secret_из_BotFather
TELEGRAM_OIDC_REDIRECT_URI=https://miniapp-9vf5.vercel.app/auth/callback
AUTH_SESSION_TTL_MS=2592000000
AUTH_MAX_AGE_SECONDS=604800
```

Если `BOT_TOKEN`, `ADMIN_ID`, `FIREBASE_KEY` уже есть — не удаляй их.

После добавления переменных сделай `Manual Deploy → Deploy latest commit`.

## 3. Vercel: переменные frontend

В Vercel → Project → Settings → Environment Variables добавь:

```env
VITE_API_BASE_URL=https://miniapp-1wz1.onrender.com
VITE_BOT_USERNAME=baraholka_miniapp_bot
```

`VITE_API_BASE_URL` замени на реальный адрес твоего Render backend.

Для этих двух переменных `Sensitive` можно оставить выключенным: это не секреты.

После изменения переменных сделай redeploy проекта Vercel.

## 4. Как проверить

1. Открой сайт в обычном браузере: `https://miniapp-9vf5.vercel.app`.
2. Нажми `Профиль` или `Создать`.
3. Нажми `Войти через Telegram`.
4. Telegram должен открыть OpenID Connect вход и вернуть пользователя на `/auth/callback`.
5. После успешной проверки сервер создаст сессию и откроет профиль.

## 5. Если вход не работает

Проверь:

- Redirect URI в BotFather строго равен `https://miniapp-9vf5.vercel.app/auth/callback`.
- Trusted Origin в BotFather строго равен `https://miniapp-9vf5.vercel.app`.
- `TELEGRAM_OIDC_CLIENT_SECRET` добавлен только в Render.
- `TELEGRAM_OIDC_CLIENT_ID` в Render совпадает с BotFather.
- После переменных был redeploy Render и Vercel.

