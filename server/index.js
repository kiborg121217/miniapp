const crypto = require("crypto");
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
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: true, credentials: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID || 8393018883);
const WEB_APP_URL =
  process.env.WEB_APP_URL || "https://miniapp-9vf5.vercel.app";
const BOT_USERNAME = process.env.BOT_USERNAME || "baraholka_miniapp_bot";
const AUTH_SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 30);
const AUTH_MAX_AGE_SECONDS = Number(process.env.AUTH_MAX_AGE_SECONDS || 60 * 60 * 24 * 7);

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get("/", (req, res) => {
  res.send("Server is working 🚀");
});

function timingSafeEqualHex(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a), "hex");
  const right = Buffer.from(String(b), "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function assertFreshAuthDate(authDate) {
  const authTimestamp = Number(authDate || 0);
  if (!Number.isFinite(authTimestamp) || authTimestamp <= 0) {
    throw new Error("Telegram не передал auth_date");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - authTimestamp) > AUTH_MAX_AGE_SECONDS) {
    throw new Error("Срок действия Telegram-авторизации истёк. Попробуйте войти заново.");
  }
}

function normalizeTelegramUser(raw) {
  if (!raw?.id) {
    throw new Error("Telegram не передал данные пользователя");
  }

  return {
    id: Number(raw.id),
    first_name: raw.first_name || raw.firstName || "",
    last_name: raw.last_name || raw.lastName || "",
    username: raw.username || "",
    photo_url: raw.photo_url || raw.photoUrl || "",
    language_code: raw.language_code || raw.languageCode || "",
  };
}

function publicUserFromProfile(profile) {
  return {
    id: Number(profile.userId || profile.telegramId || profile.id),
    first_name: profile.firstName || "",
    last_name: profile.lastName || "",
    username: profile.username || "",
    photo_url: profile.telegramAvatarUrl || profile.avatarUrl || "",
  };
}

function verifyMiniAppInitData(initData) {
  if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN не настроен на сервере");
  }

  if (!initData || typeof initData !== "string") {
    throw new Error("Нет initData для проверки Telegram Mini App");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram initData не содержит hash");
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!timingSafeEqualHex(calculatedHash, hash)) {
    throw new Error("Не удалось проверить подпись Telegram Mini App");
  }

  assertFreshAuthDate(params.get("auth_date"));

  const rawUser = params.get("user");
  if (!rawUser) {
    throw new Error("Telegram initData не содержит пользователя");
  }

  return normalizeTelegramUser(JSON.parse(rawUser));
}

function verifyTelegramLoginUser(payload) {
  if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN не настроен на сервере");
  }

  const data = { ...(payload || {}) };
  const hash = data.hash;

  if (!hash) {
    throw new Error("Telegram Login не передал hash");
  }

  delete data.hash;

  const dataCheckString = Object.keys(data)
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== "")
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!timingSafeEqualHex(calculatedHash, hash)) {
    throw new Error("Не удалось проверить подпись Telegram Login");
  }

  assertFreshAuthDate(data.auth_date);

  return normalizeTelegramUser(data);
}

async function upsertTelegramUser(telegramUser, source) {
  const user = normalizeTelegramUser(telegramUser);
  const userId = String(user.id);
  const ref = db.collection("users").doc(userId);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};
  const now = Date.now();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  const patch = {
    userId: user.id,
    telegramId: user.id,
    firstName: user.first_name || existing.firstName || "",
    lastName: user.last_name || existing.lastName || "",
    username: user.username || existing.username || "",
    telegramAvatarUrl: user.photo_url || existing.telegramAvatarUrl || "",
    avatarUrl: existing.avatarUrl || "",
    displayName: existing.displayName || fullName || user.username || "Пользователь",
    languageCode: user.language_code || existing.languageCode || "",
    authProviders: {
      ...(existing.authProviders || {}),
      telegram: true,
      [source]: true,
    },
    lastAuthAt: now,
    updatedAt: now,
    createdAt: existing.createdAt || now,
  };

  await ref.set(patch, { merge: true });
  const updated = await ref.get();

  return { id: updated.id, ...updated.data() };
}

function sessionDocId(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function createAuthSession(userId, source, req) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();

  await db.collection("user_sessions").doc(sessionDocId(token)).set({
    userId: String(userId),
    source,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    expiresAt: now + AUTH_SESSION_TTL_MS,
    userAgent: req.get("user-agent") || "",
    ip: req.ip || req.headers["x-forwarded-for"] || "",
  });

  return token;
}

async function readAuthSession(sessionToken) {
  if (!sessionToken) {
    throw new Error("Нет токена сессии");
  }

  const ref = db.collection("user_sessions").doc(sessionDocId(sessionToken));
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Сессия не найдена");
  }

  const session = snap.data();

  if (!session?.expiresAt || session.expiresAt < Date.now()) {
    await ref.delete().catch(() => {});
    throw new Error("Сессия истекла");
  }

  await ref.set({ lastSeenAt: Date.now(), updatedAt: Date.now() }, { merge: true });

  const profileSnap = await db.collection("users").doc(String(session.userId)).get();

  if (!profileSnap.exists) {
    throw new Error("Профиль пользователя не найден");
  }

  const profile = { id: profileSnap.id, ...profileSnap.data() };
  return { session, profile, user: publicUserFromProfile(profile) };
}

async function sendAuthResponse(req, res, telegramUser, source) {
  const profile = await upsertTelegramUser(telegramUser, source);
  const sessionToken = await createAuthSession(profile.userId || profile.telegramId || profile.id, source, req);

  return res.json({
    ok: true,
    user: publicUserFromProfile(profile),
    profile,
    sessionToken,
    expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
  });
}

app.get("/auth/config", (req, res) => {
  res.json({ ok: true, botUsername: BOT_USERNAME });
});

app.post("/auth/miniapp", async (req, res) => {
  try {
    const telegramUser = verifyMiniAppInitData(req.body?.initData);
    return await sendAuthResponse(req, res, telegramUser, "miniapp");
  } catch (error) {
    console.error("/auth/miniapp error:", error.message);
    return res.status(401).json({ ok: false, error: error.message || "Не удалось авторизоваться" });
  }
});

app.post("/auth/telegram-login", async (req, res) => {
  try {
    const telegramUser = verifyTelegramLoginUser(req.body?.user);
    return await sendAuthResponse(req, res, telegramUser, "website");
  } catch (error) {
    console.error("/auth/telegram-login error:", error.message);
    return res.status(401).json({ ok: false, error: error.message || "Не удалось авторизоваться" });
  }
});

app.post("/auth/session", async (req, res) => {
  try {
    const { user, profile, session } = await readAuthSession(req.body?.sessionToken);
    return res.json({ ok: true, user, profile, session });
  } catch (error) {
    return res.status(401).json({ ok: false, error: error.message || "Не удалось восстановить сессию" });
  }
});

app.post("/auth/logout", async (req, res) => {
  try {
    const token = req.body?.sessionToken;
    if (token) {
      await db.collection("user_sessions").doc(sessionDocId(token)).delete().catch(() => {});
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Не удалось выйти" });
  }
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