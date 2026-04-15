const admin = require("firebase-admin");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const cors = require("cors");

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

const app = express();
app.use(express.json());
app.use(cors());

const BOT_TOKEN =
  process.env.BOT_TOKEN || "8550022754:AAEBjOgQvsfdH2iVINv2_33r3tQdb58d8ks";
const ADMIN_ID = Number(process.env.ADMIN_ID || 8393018883);
const WEB_APP_URL =
  process.env.WEB_APP_URL || "https://miniapp-9vf5.vercel.app";

// ВАЖНО: polling выключен на старте, запускаем его вручную после app.listen
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get("/", (req, res) => {
  res.send("Server is working 🚀");
});

app.post("/new-ad", async (req, res) => {
  try {
    const ad = req.body;

    if (!ad?.id || !ad?.title || !ad?.price || !ad?.description || !ad?.imageUrl) {
      return res.status(400).json({
        ok: false,
        error: "Не хватает данных объявления",
      });
    }

    const text = `📦 Новое объявление

📌 ${ad.title}
💰 ${ad.price} ₽
📝 ${ad.description}`;

    await bot.sendPhoto(ADMIN_ID, ad.imageUrl, {
      caption: text,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Принять", callback_data: `approve_${ad.id}` },
            { text: "❌ Отклонить", callback_data: `reject_${ad.id}` },
          ],
        ],
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Ошибка /new-ad:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось отправить объявление в Telegram",
    });
  }
});

bot.on("callback_query", async (query) => {
  try {
    const data = query.data;
    const chatId = query.message.chat.id;

    if (data.startsWith("approve_")) {
      const id = data.split("_")[1];

      await db.collection("ads").doc(id).update({
        status: "approved",
      });

      await bot.sendMessage(chatId, "✅ Объявление опубликовано");

      const ad = (await db.collection("ads").doc(id).get()).data();

      if (ad?.userId) {
        await bot.sendMessage(
          ad.userId,
          `✅ Ваше объявление "${ad.title}" опубликовано!`
        );
      }
    }

    if (data.startsWith("reject_")) {
      const id = data.split("_")[1];

      await db.collection("ads").doc(id).update({
        status: "rejected",
      });

      await bot.sendMessage(chatId, "❌ Объявление отклонено");

      const ad = (await db.collection("ads").doc(id).get()).data();

      if (ad?.userId) {
        await bot.sendMessage(
          ad.userId,
          `❌ Ваше объявление "${ad.title}" отклонено.`
        );
      }
    }

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error("Ошибка callback_query:", error);
    try {
      await bot.answerCallbackQuery(query.id, {
        text: "Ошибка обработки действия",
        show_alert: false,
      });
    } catch (_) {}
  }
});

bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(
      msg.chat.id,
      "👋 Приветствую тебя!\n\nЧтобы посмотреть объявления или подать своё — нажми кнопку ниже 👇",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Открыть",
                web_app: { url: WEB_APP_URL },
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error("Ошибка /start:", error);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Server started on " + PORT);

  try {
    // Сбрасываем webhook и pending updates перед polling
    await bot.deleteWebHook({ drop_pending_updates: true });

    // Небольшая пауза, чтобы Telegram успел освободить getUpdates
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await bot.startPolling({
      restart: true,
      params: { timeout: 10 },
    });

    console.log("Bot polling started");
  } catch (error) {
    console.error("Failed to start polling:", error.message);
  }
});

// Логируем ошибки polling, чтобы было видно причину в Render
bot.on("polling_error", (error) => {
  console.error("polling_error:", error);
});

bot.on("error", (error) => {
  console.error("bot_error:", error);
});