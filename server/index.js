const admin = require("firebase-admin");

const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const bot = new TelegramBot("8550022754:AAHZuJJlafWJuF3YGQSv2RE5-eOZ9NrfM4M", { polling: true });

const ADMIN_ID = 8393018883;

app.post("/new-ad", async (req, res) => {
  const ad = req.body;

  const text = `
📦 Новое объявление

📌 ${ad.title}
💰 ${ad.price} ₽
📝 ${ad.description}
`;

  bot.sendPhoto(ADMIN_ID, ad.imageUrl, {
    caption: text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Принять", callback_data: `approve_${ad.id}` },
          { text: "❌ Отклонить", callback_data: `reject_${ad.id}` }
        ]
      ]
    }
  });

  res.send({ ok: true });
});

bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  if (data.startsWith("approve_")) {
    const id = data.split("_")[1];

    await db.collection("ads").doc(id).update({
      status: "approved"
    });

    bot.sendMessage(chatId, "✅ Объявление опубликовано");

    // уведомление пользователю
    const ad = (await db.collection("ads").doc(id).get()).data();

    if (ad.userId) {
      bot.sendMessage(ad.userId, `✅ Ваше объявление "${ad.title}" опубликовано!`);
    }
  }

  if (data.startsWith("reject_")) {
    const id = data.split("_")[1];

    await db.collection("ads").doc(id).update({
      status: "rejected"
    });

    bot.sendMessage(chatId, "❌ Объявление отклонено");

    const ad = (await db.collection("ads").doc(id).get()).data();

    if (ad.userId) {
      bot.sendMessage(ad.userId, `❌ Ваше объявление "${ad.title}" отклонено.`);
    }
  }
});

app.listen(3000, () => console.log("Server started"));