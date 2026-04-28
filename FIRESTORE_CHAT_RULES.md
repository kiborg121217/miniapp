# Firestore rules для чатов

Ниже пример логики правил. В проекте сейчас авторизация приложения построена вокруг Telegram userId/OIDC-сессии, а не Firebase Auth, поэтому правила нужно адаптировать под текущую модель безопасности.

Если позже будет добавлен Firebase Custom Auth с `request.auth.uid == telegramUserId`, можно использовать такой вариант:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function uid() {
      return request.auth.uid;
    }

    match /chats/{chatId} {
      allow read: if signedIn() && uid() in resource.data.participants;

      allow create: if signedIn()
        && uid() in request.resource.data.participants
        && request.resource.data.buyerId is string
        && request.resource.data.sellerId is string
        && request.resource.data.adId is string
        && request.resource.data.participants.size() == 2;

      allow update: if signedIn() && uid() in resource.data.participants;

      match /messages/{messageId} {
        allow read: if signedIn()
          && uid() in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;

        allow create: if signedIn()
          && request.resource.data.senderId == uid()
          && uid() in get(/databases/$(database)/documents/chats/$(chatId)).data.participants
          && request.resource.data.text is string
          && request.resource.data.text.size() > 0
          && request.resource.data.text.size() <= 1200;
      }
    }
  }
}
```

До внедрения Firebase Custom Auth защита должна обеспечиваться серверной авторизацией/OIDC и проверками на сервере там, где есть чувствительные операции. Клиентская логика уже проверяет участников диалога, но для продакшена лучше добавить Custom Auth или серверные proxy endpoints для записи.
