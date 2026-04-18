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

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID || 8393018883);
const WEB_APP_URL =
  process.env.WEB_APP_URL || "https://miniapp-9vf5.vercel.app";

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get("/", (req, res) => {
  res.send("Server is working 🚀");
});

async function downloadImageToBuffer(url) {
  const imageResponse = await fetch(url);

  if (!imageResponse.ok) {
    throw new Error(`Не удалось скачать изображение: ${url}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

app.post("/new-ad", async (req, res) => {
  try {
    const ad = req.body;

    const imageUrls =
      Array.isArray(ad?.imageUrls) && ad.imageUrls.length > 0
        ? ad.imageUrls
        : ad?.imageUrl
        ? [ad.imageUrl]
        : [];

    if (!ad?.id || !ad?.title || !ad?.price || !ad?.description || imageUrls.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Не хватает данных объявления",
      });
    }

    const text = `📦 Новое объявление

📌 ${ad.title}
🗂 Категория: ${ad.category || "Без категории"}
💰 ${ad.price} ₽
📝 ${ad.description}`;

    if (imageUrls.length > 1) {
      const media = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const buffer = await downloadImageToBuffer(imageUrls[i]);

        media.push({
          type: "photo",
          media: buffer,
          filename: `ad_${ad.id}_${i + 1}.jpg`,
          contentType: "image/jpeg",
          ...(i === 0 ? { caption: text } : {}),
        });
      }

      await bot.sendMediaGroup(ADMIN_ID, media);

      await bot.sendMessage(ADMIN_ID, "Выберите действие:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Принять", callback_data: `approve_${ad.id}` },
              { text: "❌ Отклонить", callback_data: `reject_${ad.id}` },
            ],
          ],
        },
      });
    } else {
      const photoBuffer = await downloadImageToBuffer(imageUrls[0]);

      await bot.sendPhoto(
        ADMIN_ID,
        photoBuffer,
        {
          caption: text,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Принять", callback_data: `approve_${ad.id}` },
                { text: "❌ Отклонить", callback_data: `reject_${ad.id}` },
              ],
            ],
          },
        },
        {
          filename: `ad_${ad.id}.jpg`,
          contentType: "image/jpeg",
        }
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Ошибка /new-ad:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось отправить объявление в Telegram",
    });
  }
});

app.post("/promote-ad", async (req, res) => {
  try {
    const { adId, userId, type } = req.body;

    if (!adId || !userId || !type) {
      return res.status(400).json({
        ok: false,
        error: "Не хватает данных для продвижения",
      });
    }

    const adRef = db.collection("ads").doc(String(adId));
    const adSnap = await adRef.get();

    if (!adSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "Объявление не найдено",
      });
    }

    const ad = adSnap.data();

    if (String(ad.userId) !== String(userId)) {
      return res.status(403).json({
        ok: false,
        error: "Нельзя продвигать чужое объявление",
      });
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const patch = {};

    if (type === "boost") {
      patch.boostUntil = now + day;
      patch.boostedAt = now;
      patch.promotePack = "boost";
    }

    if (type === "vip") {
      patch.isVip = true;
      patch.vipUntil = now + 3 * day;
      patch.promotePack = "vip";
    }

    if (type === "pin") {
      patch.isPinned = true;
      patch.pinnedUntil = now + 3 * day;
      patch.promotePack = "pin";
    }

    if (type === "turbo") {
      patch.isVip = true;
      patch.vipUntil = now + 3 * day;
      patch.isPinned = true;
      patch.pinnedUntil = now + 3 * day;
      patch.boostUntil = now + 3 * day;
      patch.boostedAt = now;
      patch.promotePack = "turbo";
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({
        ok: false,
        error: "Неизвестный тип продвижения",
      });
    }

    await adRef.update(patch);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Ошибка /promote-ad:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось применить продвижение",
    });
  }
});

app.post("/request-phone-verification", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "Нет userId",
      });
    }

    await bot.sendMessage(
      userId,
      "Для подтверждения профиля нажми кнопку ниже и отправь свой номер телефона.",
      {
        reply_markup: {
          keyboard: [[{ text: "📱 Подтвердить номер", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("request-phone-verification error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось отправить запрос на подтверждение",
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

bot.on("contact", async (msg) => {
  try {
    const contact = msg.contact;
    const telegramUserId = msg.from.id;

    if (!contact) return;

    if (contact.user_id !== telegramUserId) {
      await bot.sendMessage(
        msg.chat.id,
        "❌ Можно подтвердить только свой собственный номер.",
        {
          reply_markup: {
            remove_keyboard: true,
          },
        }
      );
      return;
    }

    await db.collection("users").doc(String(telegramUserId)).set(
      {
        isVerified: true,
        verifiedAt: Date.now(),
        phoneNumber: contact.phone_number || "",
      },
      { merge: true }
    );

    await bot.sendMessage(
      msg.chat.id,
      "✅ Профиль успешно подтверждён.",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
  } catch (error) {
    console.error("contact handler error:", error);
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
    await bot.deleteWebHook({ drop_pending_updates: true });
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

bot.on("polling_error", (error) => {
  console.error("polling_error:", error);
});

bot.on("error", (error) => {
  console.error("bot_error:", error);
});