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

const TELEGRAM_OIDC_CLIENT_ID = String(
  process.env.TELEGRAM_OIDC_CLIENT_ID || process.env.OIDC_CLIENT_ID || ""
);
const TELEGRAM_OIDC_CLIENT_SECRET = String(
  process.env.TELEGRAM_OIDC_CLIENT_SECRET || process.env.OIDC_CLIENT_SECRET || ""
);
const TELEGRAM_OIDC_REDIRECT_URI = String(
  process.env.TELEGRAM_OIDC_REDIRECT_URI || `${WEB_APP_URL}/auth/callback`
);
const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_OIDC_AUTH_URL = "https://oauth.telegram.org/auth";
const TELEGRAM_OIDC_TOKEN_URL = "https://oauth.telegram.org/token";
const TELEGRAM_OIDC_JWKS_URL = "https://oauth.telegram.org/.well-known/jwks.json";
const OIDC_STATE_TTL_MS = Number(process.env.OIDC_STATE_TTL_MS || 1000 * 60 * 10);
let telegramJwksCache = { keys: [], expiresAt: 0 };

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


function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input) {
  const value = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function randomBase64Url(bytes = 32) {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

function sha256Base64Url(value) {
  return base64UrlEncode(crypto.createHash("sha256").update(value).digest());
}

function safeJsonParse(bufferOrString) {
  try {
    return JSON.parse(Buffer.isBuffer(bufferOrString) ? bufferOrString.toString("utf8") : String(bufferOrString));
  } catch {
    return null;
  }
}

function assertOidcConfigured() {
  if (!TELEGRAM_OIDC_CLIENT_ID || !TELEGRAM_OIDC_CLIENT_SECRET) {
    throw new Error("Telegram OpenID Connect не настроен на сервере");
  }
}

async function createOidcState(returnTo = "profile") {
  assertOidcConfigured();

  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = sha256Base64Url(codeVerifier);
  const now = Date.now();

  await db.collection("auth_oidc_states").doc(state).set({
    state,
    codeVerifier,
    codeChallenge,
    returnTo: String(returnTo || "profile"),
    createdAt: now,
    expiresAt: now + OIDC_STATE_TTL_MS,
  });

  return { state, codeVerifier, codeChallenge };
}

async function readAndDeleteOidcState(state) {
  if (!state) {
    throw new Error("Telegram не вернул state");
  }

  const ref = db.collection("auth_oidc_states").doc(String(state));
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Сессия входа не найдена или уже использована");
  }

  const data = snap.data();
  await ref.delete().catch(() => {});

  if (!data?.expiresAt || data.expiresAt < Date.now()) {
    throw new Error("Сессия входа истекла. Попробуйте войти заново.");
  }

  if (!data?.codeVerifier) {
    throw new Error("Сессия входа повреждена. Попробуйте войти заново.");
  }

  return data;
}

async function fetchTelegramJwks() {
  if (telegramJwksCache.expiresAt > Date.now() && telegramJwksCache.keys.length) {
    return telegramJwksCache.keys;
  }

  const response = await fetch(TELEGRAM_OIDC_JWKS_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Не удалось получить ключи Telegram для проверки входа");
  }

  const data = await response.json();
  telegramJwksCache = {
    keys: Array.isArray(data.keys) ? data.keys : [],
    expiresAt: Date.now() + 1000 * 60 * 60,
  };

  return telegramJwksCache.keys;
}

function webCryptoAlgorithmForJwt(header) {
  const alg = header?.alg;

  if (alg === "RS256") {
    return {
      importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
    };
  }

  if (alg === "PS256") {
    return {
      importAlgorithm: { name: "RSA-PSS", hash: "SHA-256" },
      verifyAlgorithm: { name: "RSA-PSS", saltLength: 32 },
    };
  }

  if (alg === "ES256") {
    return {
      importAlgorithm: { name: "ECDSA", namedCurve: "P-256" },
      verifyAlgorithm: { name: "ECDSA", hash: "SHA-256" },
    };
  }

  throw new Error(`Неподдерживаемый алгоритм подписи Telegram: ${alg || "unknown"}`);
}

async function verifyJwtWithJwks(idToken) {
  const parts = String(idToken || "").split(".");

  if (parts.length !== 3) {
    throw new Error("Telegram вернул некорректный id_token");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = safeJsonParse(base64UrlDecode(encodedHeader));
  const claims = safeJsonParse(base64UrlDecode(encodedPayload));

  if (!header || !claims) {
    throw new Error("Не удалось прочитать id_token Telegram");
  }

  const keys = await fetchTelegramJwks();
  let jwk = keys.find((key) => key.kid && key.kid === header.kid);

  if (!jwk && keys.length === 1) {
    jwk = keys[0];
  }

  if (!jwk) {
    throw new Error("Не найден публичный ключ Telegram для проверки входа");
  }

  const { importAlgorithm, verifyAlgorithm } = webCryptoAlgorithmForJwt(header);
  const key = await crypto.webcrypto.subtle.importKey(
    "jwk",
    jwk,
    importAlgorithm,
    false,
    ["verify"]
  );

  const signedData = Buffer.from(`${encodedHeader}.${encodedPayload}`, "utf8");
  const signature = base64UrlDecode(encodedSignature);
  const valid = await crypto.webcrypto.subtle.verify(
    verifyAlgorithm,
    key,
    signature,
    signedData
  );

  if (!valid) {
    throw new Error("Не удалось проверить подпись Telegram id_token");
  }

  return claims;
}

function assertTelegramOidcClaims(claims) {
  if (claims.iss !== TELEGRAM_OIDC_ISSUER) {
    throw new Error("Некорректный issuer Telegram id_token");
  }

  const aud = Array.isArray(claims.aud) ? claims.aud.map(String) : [String(claims.aud || "")];
  if (!aud.includes(String(TELEGRAM_OIDC_CLIENT_ID))) {
    throw new Error("Telegram id_token выпущен не для этого приложения");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || Number(claims.exp) <= now) {
    throw new Error("Срок действия Telegram id_token истёк");
  }

  if (claims.iat && Number(claims.iat) > now + 60) {
    throw new Error("Telegram id_token имеет некорректное время выпуска");
  }
}

function normalizeTelegramOidcUser(claims) {
  const id = claims.id || claims.sub;

  if (!id) {
    throw new Error("Telegram id_token не содержит пользователя");
  }

  const name = String(claims.name || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);

  return {
    id: Number(id),
    first_name: claims.given_name || parts[0] || name || claims.preferred_username || "Пользователь",
    last_name: claims.family_name || (parts.length > 1 ? parts.slice(1).join(" ") : ""),
    username: claims.preferred_username || claims.username || "",
    photo_url: claims.picture || "",
    phone_number: claims.phone_number || "",
    language_code: claims.locale || "",
  };
}

async function verifyTelegramOidcIdToken(idToken) {
  assertOidcConfigured();
  const claims = await verifyJwtWithJwks(idToken);
  assertTelegramOidcClaims(claims);
  return normalizeTelegramOidcUser(claims);
}

async function exchangeTelegramOidcCode(code, codeVerifier) {
  assertOidcConfigured();

  if (!code) {
    throw new Error("Telegram не вернул код авторизации");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri: TELEGRAM_OIDC_REDIRECT_URI,
    client_id: TELEGRAM_OIDC_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const basic = Buffer.from(
    `${TELEGRAM_OIDC_CLIENT_ID}:${TELEGRAM_OIDC_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(TELEGRAM_OIDC_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
    },
    body,
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!response.ok || !data.id_token) {
    throw new Error(data.error_description || data.error || "Telegram не выдал id_token");
  }

  return data;
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
    phone_number: raw.phone_number || raw.phoneNumber || "",
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
    phoneNumber: existing.phoneNumber || user.phone_number || "",
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


app.post("/auth/oidc/start", async (req, res) => {
  try {
    const returnTo = req.body?.returnTo || "profile";
    const { state, codeChallenge } = await createOidcState(returnTo);
    const scope = String(req.body?.scope || "openid profile");

    const url = new URL(TELEGRAM_OIDC_AUTH_URL);
    url.searchParams.set("client_id", TELEGRAM_OIDC_CLIENT_ID);
    url.searchParams.set("redirect_uri", TELEGRAM_OIDC_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scope);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    return res.json({
      ok: true,
      authUrl: url.toString(),
      state,
      redirectUri: TELEGRAM_OIDC_REDIRECT_URI,
    });
  } catch (error) {
    console.error("/auth/oidc/start error:", error.message);
    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось начать Telegram OpenID Connect вход",
    });
  }
});

app.post("/auth/oidc/callback", async (req, res) => {
  try {
    const { code, state } = req.body || {};
    const oidcState = await readAndDeleteOidcState(state);
    const tokens = await exchangeTelegramOidcCode(code, oidcState.codeVerifier);
    const telegramUser = await verifyTelegramOidcIdToken(tokens.id_token);

    return await sendAuthResponse(req, res, telegramUser, "website_oidc");
  } catch (error) {
    console.error("/auth/oidc/callback error:", error.message);
    return res.status(401).json({
      ok: false,
      error: error.message || "Не удалось завершить Telegram OpenID Connect вход",
    });
  }
});

app.post("/auth/oidc/token", async (req, res) => {
  try {
    const telegramUser = await verifyTelegramOidcIdToken(req.body?.idToken);
    return await sendAuthResponse(req, res, telegramUser, "website_oidc_library");
  } catch (error) {
    console.error("/auth/oidc/token error:", error.message);
    return res.status(401).json({
      ok: false,
      error: error.message || "Не удалось проверить Telegram OpenID Connect вход",
    });
  }
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