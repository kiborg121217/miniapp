# Обновление: внутренние чаты покупатель ↔ продавец

Добавлен MVP внутреннего чата прямо в Mini App / сайте.

## Что добавлено

- Кнопка **«Написать»** в карточке объявления больше не зависит от Telegram username.
- При нажатии создаётся документ в `chats/{chatId}` по связке `adId + buyerId + sellerId`.
- Сообщения хранятся в `chats/{chatId}/messages`.
- Новый раздел навигации: **Главная → Создать → Чаты → Профиль**.
- В профиле добавлен пункт **Сообщения**.
- Список чатов показывает последнее сообщение, дату и счётчик непрочитанных.
- Переписка работает через Firestore realtime (`onSnapshot`), поэтому не зависит от холодного старта Render.
- Render используется только для Telegram-уведомлений через endpoint `/notify-chat-message`.
- В настройках появился экран **Уведомления** с `requestWriteAccess` для Mini App.
- OIDC 2.0 сохранён, старый Login Widget не возвращался.

## Firestore-структура

```txt
chats/{chatId}
  adId
  adTitle
  adImage
  buyerId
  sellerId
  participants: [buyerId, sellerId]
  lastMessage
  lastMessageAt
  unreadByBuyer
  unreadBySeller
  createdAt
  updatedAt

chats/{chatId}/messages/{messageId}
  senderId
  text
  createdAt
  read
```

## Уведомления

Настройки пользователя хранятся в `users/{userId}`:

```js
notifications: {
  chatMessages: true,
  moderation: true,
  promotion: true,
  favorites: false
},
botCanMessage: true
```

По умолчанию основные уведомления считаются включёнными, если поле не задано.

## Важно по архитектуре

- **Vercel**: фронтенд Mini App / сайта.
- **Firestore**: объявления, профили, чаты, сообщения, непрочитанные, настройки уведомлений.
- **Render**: сервер бота, OIDC 2.0 endpoints и Telegram-уведомления.

Чат не идёт через Render, поэтому задержки бесплатного Render не должны тормозить отправку и получение сообщений внутри приложения.
