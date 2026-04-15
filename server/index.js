const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} else {
  serviceAccount = require("./firebase-key.json");
}

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
  try {
    const ad = req.body;

    const text = `
📦 Новое объявление

📌 ${ad.title}
💰 ${ad.price} ₽
📝 ${ad.description}
`;

    await bot.sendPhoto(ADMIN_ID, ad.imageUrl, {
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

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Ошибка /new-ad:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось отправить объявление в бота"
    });
  }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    "👋 Приветствую тебя!\n\nЧтобы посмотреть объявления или подать своё — нажми кнопку ниже 👇",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Открыть",
              web_app: { url: "https://miniapp-9vf5.vercel.app" }
            }
          ]
        ]
      }
    }
  );
});