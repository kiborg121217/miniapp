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

const VK_ID_CLIENT_ID = String(process.env.VK_ID_CLIENT_ID || process.env.VK_CLIENT_ID || "");
const VK_ID_CLIENT_SECRET = String(process.env.VK_ID_CLIENT_SECRET || process.env.VK_CLIENT_SECRET || "");
const VK_ID_REDIRECT_URI = String(
  process.env.VK_ID_REDIRECT_URI || `${WEB_APP_URL}/auth/vk/callback`
);
const VK_ID_AUTH_URL = "https://id.vk.ru/authorize";
const VK_ID_TOKEN_URL = "https://id.vk.ru/oauth2/auth";
const VK_ID_USER_INFO_URL = "https://id.vk.ru/oauth2/user_info";
const VK_ID_STATE_TTL_MS = Number(process.env.VK_ID_STATE_TTL_MS || 1000 * 60 * 10);
const VK_MINI_APP_SECRET = String(
  process.env.VK_MINI_APP_SECRET ||
    process.env.VK_APP_SECRET ||
    process.env.VK_MINI_APP_SECURE_KEY ||
    ""
);

const VK_COMMUNITY_ID = String(
  process.env.VK_COMMUNITY_ID || process.env.VK_GROUP_ID || process.env.VK_PUBLIC_ID || ""
).replace(/^-/, "").trim();
const VK_COMMUNITY_TOKEN = String(
  process.env.VK_COMMUNITY_TOKEN || process.env.VK_GROUP_TOKEN || process.env.VK_COMMUNITY_ACCESS_TOKEN || ""
);
const VK_API_VERSION = String(process.env.VK_API_VERSION || "5.199");

let telegramJwksCache = { keys: [], expiresAt: 0 };

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get("/", (req, res) => {
  res.send("Server is working 🚀");
});

async function sendUserNotification(userId, text, notificationKey = "chatMessages", options = {}) {
  if (!userId) return { ok: false, skipped: true, reason: "missing_user" };

  const userRef = db.collection("users").doc(String(userId));
  const userSnap = await userRef.get();
  const profile = userSnap.exists ? userSnap.data() : {};
  const notifications = profile?.notifications || {};

  if (notifications[notificationKey] === false) {
    return { ok: false, skipped: true, reason: "disabled" };
  }

  if (isVkProfile(profile)) {
    if (profile?.vkNotificationsEnabled === false || profile?.vkCommunityMessagesAllowed !== true) {
      return { ok: false, skipped: true, channel: "vk", reason: "vk_messages_not_allowed" };
    }

    try {
      const result = await sendVkCommunityMessage(profile.vkId, text, {
        telegramOptions: options,
        url: extractNotificationUrl(options) || WEB_APP_URL,
      });
      return { ...result, channel: "vk" };
    } catch (error) {
      console.error("sendVkCommunityMessage error:", error.message);
      const msg = String(error.message || "").toLowerCase();
      const noAccess = msg.includes("can't send") || msg.includes("not allowed") || msg.includes("permission") || msg.includes("access denied");

      if (noAccess) {
        await userRef.set(
          {
            vkCommunityMessagesAllowed: false,
            vkNotificationsEnabled: false,
            vkNotificationStatus: "send_denied",
            vkNotificationsLastError: error.message,
            updatedAt: Date.now(),
          },
          { merge: true }
        ).catch(() => {});
      }

      return { ok: false, channel: "vk", error: error.message };
    }
  }

  if (!BOT_TOKEN) return { ok: false, skipped: true, reason: "missing_bot_token" };

  if (profile?.botCanMessage === false) {
    return { ok: false, skipped: true, reason: "no_write_access" };
  }

  try {
    await bot.sendMessage(String(userId), text, options);
    return { ok: true, channel: "telegram" };
  } catch (error) {
    console.error("sendUserNotification error:", error.message);
    if (String(error.message || "").includes("bot can't initiate conversation")) {
      await userRef.set({ botCanMessage: false, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
    return { ok: false, channel: "telegram", error: error.message };
  }
}
function buildMiniAppChatUrl(chatId) {
  return `${WEB_APP_URL}?chat=${encodeURIComponent(String(chatId))}`;
}

function buildVkCommunityWriteUrl() {
  return VK_COMMUNITY_ID ? `https://vk.com/write-${VK_COMMUNITY_ID}` : "";
}

function isVkProfile(profile) {
  return Boolean(profile?.vkId || profile?.authProvider === "vk" || String(profile?.userId || "").startsWith("vk_"));
}

function extractNotificationUrl(options = {}) {
  const keyboard = options?.reply_markup?.inline_keyboard;
  if (!Array.isArray(keyboard)) return "";

  for (const row of keyboard) {
    if (!Array.isArray(row)) continue;
    for (const button of row) {
      const url = button?.url || button?.web_app?.url;
      if (url) return String(url);
    }
  }

  return "";
}

function appendUrlToVkMessage(text, url) {
  const cleanText = String(text || "").trim();
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return cleanText;
  return `${cleanText}\n\nОткрыть в Барахолке: ${cleanUrl}`;
}

async function callVkApi(method, params = {}) {
  if (!VK_COMMUNITY_TOKEN) {
    throw new Error("VK community token не настроен на сервере");
  }

  const body = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
    ),
    access_token: VK_COMMUNITY_TOKEN,
    v: VK_API_VERSION,
  });

  const response = await fetch(`https://api.vk.com/method/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: { error_msg: text || "VK API вернул некорректный ответ" } };
  }

  if (!response.ok || data.error) {
    const vkError = data.error || {};
    const message = vkError.error_msg || vkError.error_description || "VK API error";
    const error = new Error(message);
    error.vkError = vkError;
    throw error;
  }

  return data.response;
}

async function checkVkCommunityMessagesAllowed(vkId) {
  const connectUrl = buildVkCommunityWriteUrl();

  if (!VK_COMMUNITY_ID) {
    return {
      ok: false,
      configured: false,
      canCheck: false,
      isAllowed: false,
      communityId: "",
      connectUrl,
      error: "VK_COMMUNITY_ID не настроен",
    };
  }

  if (!VK_COMMUNITY_TOKEN) {
    return {
      ok: false,
      configured: true,
      canCheck: false,
      isAllowed: false,
      communityId: VK_COMMUNITY_ID,
      connectUrl,
      error: "VK_COMMUNITY_TOKEN не настроен",
    };
  }

  if (!vkId) {
    return {
      ok: false,
      configured: true,
      canCheck: true,
      isAllowed: false,
      communityId: VK_COMMUNITY_ID,
      connectUrl,
      error: "У пользователя нет vkId",
    };
  }

  const response = await callVkApi("messages.isMessagesFromGroupAllowed", {
    group_id: VK_COMMUNITY_ID,
    user_id: String(vkId),
  });

  const isAllowed = Boolean(response?.is_allowed === 1 || response?.is_allowed === true);

  return {
    ok: true,
    configured: true,
    canCheck: true,
    isAllowed,
    communityId: VK_COMMUNITY_ID,
    connectUrl,
    response,
  };
}

async function updateVkCommunityNotificationStatus(userRef, checkResult, extra = {}) {
  const now = Date.now();
  const isAllowed = Boolean(checkResult?.isAllowed);
  const patch = {
    vkCommunityId: VK_COMMUNITY_ID || checkResult?.communityId || "",
    vkCommunityWriteUrl: checkResult?.connectUrl || buildVkCommunityWriteUrl(),
    vkCommunityMessagesAllowed: isAllowed,
    vkNotificationsEnabled: isAllowed,
    vkNotificationStatus: isAllowed ? "allowed" : checkResult?.canCheck === false ? "needs_server_config" : "not_allowed",
    vkNotificationsCheckedAt: now,
    updatedAt: now,
    ...extra,
  };

  if (isAllowed) {
    patch.vkNotificationsConnectedAt = extra.vkNotificationsConnectedAt || now;
  }

  await userRef.set(patch, { merge: true }).catch(() => {});
  return patch;
}

async function sendVkCommunityMessage(vkId, text, options = {}) {
  if (!VK_COMMUNITY_ID || !VK_COMMUNITY_TOKEN) {
    return { ok: false, skipped: true, reason: "vk_community_not_configured" };
  }

  if (!vkId) {
    return { ok: false, skipped: true, reason: "missing_vk_id" };
  }

  const url = options.url || extractNotificationUrl(options.telegramOptions) || WEB_APP_URL;
  const message = appendUrlToVkMessage(text, url).slice(0, 3900);

  const response = await callVkApi("messages.send", {
    user_id: String(vkId),
    random_id: String(Date.now() + Math.floor(Math.random() * 1000000)),
    message,
  });

  return { ok: true, response };
}




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

function decodeJwtPayloadWithoutVerify(token) {
  const parts = String(token || "").split(".");
  if (parts.length < 2) return {};
  return safeJsonParse(base64UrlDecode(parts[1])) || {};
}

function cleanVkUsername(value, fallbackVkId = "") {
  const raw = String(value || "").trim();
  const cleaned = raw
    .replace(/^https?:\/\/(m\.)?vk\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/\?.*$/, "")
    .replace(/\/.*$/, "")
    .trim();

  if (cleaned && cleaned !== "id0") return cleaned;
  return fallbackVkId ? `id${fallbackVkId}` : "";
}

function normalizeVkPhone(value) {
  const phone = String(value || "").trim();
  if (!phone) return "";
  return phone.replace(/[()\s-]/g, "");
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

function normalizePublicUserId(value) {
  if (value === undefined || value === null || value === "") return null;
  const raw = String(value);

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isSafeInteger(numeric)) return numeric;
  }

  return raw;
}

function publicUserFromProfile(profile) {
  const userId = profile.userId || profile.telegramId || profile.vkUid || profile.id;
  const isVkProfile = profile.authProvider === "vk" || Boolean(profile.vkId);

  return {
    id: normalizePublicUserId(userId),
    first_name: profile.firstName || "",
    last_name: profile.lastName || "",
    username: profile.username || profile.vkDomain || "",
    photo_url: profile.telegramAvatarUrl || profile.vkAvatarUrl || profile.avatarUrl || "",
    phone_number: profile.phoneNumber || "",
    isVerified: Boolean(profile.isVerified || profile.identityVerified || isVkProfile),
    phoneVerified: Boolean(profile.phoneVerified),
    phoneVerificationRequired: profile.phoneVerificationRequired !== undefined ? Boolean(profile.phoneVerificationRequired) : !isVkProfile,
    authProvider: profile.authProvider || (isVkProfile ? "vk" : "telegram"),
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


function base64UrlFromBuffer(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseVkLaunchParams(searchOrQuery) {
  const raw = String(searchOrQuery || "").replace(/^\?/, "");
  const params = new URLSearchParams(raw);
  const result = {};

  for (const [key, value] of params.entries()) {
    if (key === "sign" || key.startsWith("vk_")) {
      result[key] = value;
    }
  }

  return result;
}

function verifyVkMiniAppLaunchParams(searchOrQuery) {
  if (!VK_MINI_APP_SECRET) {
    throw new Error("VK Mini App secret не настроен на сервере. Авто-вход внутри VK Mini App пока недоступен.");
  }

  const params = parseVkLaunchParams(searchOrQuery);
  const sign = params.sign;
  const queryParams = Object.keys(params)
    .filter((key) => key !== "sign" && key.startsWith("vk_") && params[key] !== undefined && params[key] !== null)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${encodeURIComponent(String(params[key]))}`)
    .join("&");

  if (!sign || !queryParams) {
    throw new Error("VK Mini App не передал корректные launch-параметры");
  }

  const calculated = base64UrlFromBuffer(
    crypto.createHmac("sha256", VK_MINI_APP_SECRET).update(queryParams).digest()
  );

  if (calculated !== String(sign)) {
    throw new Error("Не удалось проверить подпись VK Mini App");
  }

  if (VK_ID_CLIENT_ID && params.vk_app_id && String(params.vk_app_id) !== String(VK_ID_CLIENT_ID)) {
    throw new Error("VK Mini App запущен не для этого приложения");
  }

  return params;
}

function normalizeVkMiniAppBridgeUser(bridgeUser = {}) {
  if (!bridgeUser || typeof bridgeUser !== "object") return {};

  return {
    id: bridgeUser.id || bridgeUser.user_id || "",
    first_name: bridgeUser.first_name || bridgeUser.firstName || "",
    last_name: bridgeUser.last_name || bridgeUser.lastName || "",
    username: bridgeUser.domain || bridgeUser.screen_name || bridgeUser.nickname || bridgeUser.username || "",
    display_name: [bridgeUser.first_name || bridgeUser.firstName || "", bridgeUser.last_name || bridgeUser.lastName || ""]
      .filter(Boolean)
      .join(" ")
      .trim(),
    photo_url:
      bridgeUser.photo_max_orig ||
      bridgeUser.photo_400_orig ||
      bridgeUser.photo_200 ||
      bridgeUser.photo_100 ||
      bridgeUser.avatar ||
      bridgeUser.picture ||
      "",
  };
}

function normalizeVkMiniAppUser(launchParams, bridgeUser = {}) {
  const vkId = String(launchParams?.vk_user_id || bridgeUser?.id || bridgeUser?.user_id || "").trim();

  if (!vkId) {
    throw new Error("VK Mini App не передал vk_user_id");
  }

  const normalizedBridgeUser = normalizeVkMiniAppBridgeUser(bridgeUser);

  return normalizeVkIdUser({
    user_id: vkId,
    id: vkId,
    first_name: normalizedBridgeUser.first_name,
    last_name: normalizedBridgeUser.last_name,
    username: normalizedBridgeUser.username || `id${vkId}`,
    domain: normalizedBridgeUser.username || `id${vkId}`,
    display_name: normalizedBridgeUser.display_name || `id${vkId}`,
    avatar: normalizedBridgeUser.photo_url,
    picture: normalizedBridgeUser.photo_url,
  });
}

function assertVkIdConfigured() {
  if (!VK_ID_CLIENT_ID) {
    throw new Error("VK ID не настроен на сервере: нет VK_ID_CLIENT_ID");
  }
}

async function createVkIdState(returnTo = "profile") {
  assertVkIdConfigured();

  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = sha256Base64Url(codeVerifier);
  const now = Date.now();

  await db.collection("auth_vk_states").doc(state).set({
    state,
    codeVerifier,
    codeChallenge,
    returnTo: String(returnTo || "profile"),
    createdAt: now,
    expiresAt: now + VK_ID_STATE_TTL_MS,
  });

  return { state, codeVerifier, codeChallenge };
}

async function readAndDeleteVkIdState(state) {
  if (!state) {
    throw new Error("VK ID не вернул state");
  }

  const ref = db.collection("auth_vk_states").doc(String(state));
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Сессия VK-входа не найдена или уже использована");
  }

  const data = snap.data();
  await ref.delete().catch(() => {});

  if (!data?.expiresAt || data.expiresAt < Date.now()) {
    throw new Error("Сессия VK-входа истекла. Попробуйте войти заново.");
  }

  if (!data?.codeVerifier) {
    throw new Error("Сессия VK-входа повреждена. Попробуйте войти заново.");
  }

  return data;
}

async function exchangeVkIdCode(code, deviceId, codeVerifier) {
  assertVkIdConfigured();

  if (!code) {
    throw new Error("VK ID не вернул код авторизации");
  }

  if (!deviceId) {
    throw new Error("VK ID не вернул device_id. Попробуйте войти заново.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code),
    client_id: VK_ID_CLIENT_ID,
    redirect_uri: VK_ID_REDIRECT_URI,
    code_verifier: codeVerifier,
    device_id: String(deviceId),
  });

  const response = await fetch(VK_ID_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "VK ID не выдал access_token");
  }

  return data;
}

async function fetchVkIdUserInfo(accessToken) {
  const body = new URLSearchParams({
    access_token: String(accessToken || ""),
    client_id: VK_ID_CLIENT_ID,
  });

  const response = await fetch(VK_ID_USER_INFO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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

  if (!response.ok || data.error || !data.user) {
    throw new Error(data.error_description || data.error || "VK ID не вернул данные пользователя");
  }

  return data.user;
}

function normalizeVkIdUser(rawUser, tokenData = {}) {
  const idTokenClaims = decodeJwtPayloadWithoutVerify(tokenData?.id_token);
  const rawVkId =
    rawUser?.user_id ||
    rawUser?.id ||
    rawUser?.sub ||
    tokenData?.user_id ||
    tokenData?.sub ||
    idTokenClaims?.sub ||
    idTokenClaims?.user_id;

  if (!rawVkId) {
    throw new Error("VK ID не вернул идентификатор пользователя");
  }

  const vkId = String(rawVkId);
  const firstName = rawUser.first_name || rawUser.firstName || idTokenClaims?.given_name || rawUser.name || "";
  const lastName = rawUser.last_name || rawUser.lastName || idTokenClaims?.family_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const username = cleanVkUsername(
    rawUser.username ||
      rawUser.domain ||
      rawUser.screen_name ||
      rawUser.nickname ||
      rawUser.preferred_username ||
      idTokenClaims?.preferred_username ||
      idTokenClaims?.screen_name,
    vkId
  );

  const avatarUrl =
    rawUser.avatar ||
    rawUser.picture ||
    rawUser.photo_400_orig ||
    rawUser.photo_max_orig ||
    rawUser.photo_200 ||
    rawUser.photo_max ||
    rawUser.photo ||
    idTokenClaims?.picture ||
    "";

  const email = rawUser.email || idTokenClaims?.email || "";
  const phone = normalizeVkPhone(
    rawUser.phone ||
      rawUser.phone_number ||
      rawUser.phoneNumber ||
      idTokenClaims?.phone ||
      idTokenClaims?.phone_number
  );

  return {
    id: vkId,
    vkId,
    vkUid: `vk_${vkId}`,
    first_name: firstName,
    last_name: lastName,
    username,
    display_name: rawUser.display_name || rawUser.displayName || fullName || username || rawUser.email || "Пользователь VK",
    photo_url: avatarUrl,
    email,
    phone_number: phone,
    vkProfileUrl: username ? `https://vk.com/${username}` : `https://vk.com/id${vkId}`,
  };
}

async function upsertVkIdUser(vkUser, source) {
  const user = normalizeVkIdUser(vkUser);
  const userId = user.vkUid;
  const ref = db.collection("users").doc(userId);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};
  const now = Date.now();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const hasCustomAvatar = Boolean(existing.avatarUrl && existing.avatarUrl !== existing.vkAvatarUrl);
  const verifiedAt = existing.verifiedAt || now;

  const patch = {
    userId,
    vkId: user.vkId,
    authProvider: existing.authProvider || "vk",
    firstName: user.first_name || existing.firstName || "",
    lastName: user.last_name || existing.lastName || "",
    username: user.username || existing.username || `id${user.vkId}`,
    vkDomain: user.username || existing.vkDomain || `id${user.vkId}`,
    vkProfileUrl: user.vkProfileUrl || existing.vkProfileUrl || `https://vk.com/id${user.vkId}`,
    vkAvatarUrl: user.photo_url || existing.vkAvatarUrl || "",
    avatarUrl: hasCustomAvatar ? existing.avatarUrl : user.photo_url || existing.avatarUrl || "",
    displayName: existing.displayName || user.display_name || fullName || user.username || "Пользователь VK",
    phoneNumber: existing.phoneNumber || user.phone_number || "",
    email: existing.email || user.email || "",
    isVerified: true,
    identityVerified: true,
    profileVerified: true,
    verifiedAt,
    verifiedBy: existing.verifiedBy || "vk_id",
    verificationProvider: existing.verificationProvider || "vk_id",
    identityVerificationProvider: existing.identityVerificationProvider || "vk_id",
    vkVerifiedAt: existing.vkVerifiedAt || now,
    phoneVerified: Boolean(existing.phoneVerified || user.phone_number),
    phoneVerificationRequired: false,
    phoneVerificationStatus: user.phone_number ? "verified" : "not_provided_by_vk",
    phoneVerificationProvider: existing.phoneVerificationProvider || (user.phone_number ? "vk_id" : "vk_id_not_returned"),
    authProviders: {
      ...(existing.authProviders || {}),
      vk: true,
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

async function sendVkAuthResponse(req, res, vkUser, source) {
  const profile = await upsertVkIdUser(vkUser, source);
  const sessionToken = await createAuthSession(profile.userId || profile.id, source, req);

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


app.post("/auth/vk-miniapp", async (req, res) => {
  try {
    const launchParams = req.body?.launchParams;
    const bridgeUser = req.body?.bridgeUser || null;
    const verifiedLaunchParams = verifyVkMiniAppLaunchParams(launchParams);
    const vkUser = normalizeVkMiniAppUser(verifiedLaunchParams, bridgeUser);

    return await sendVkAuthResponse(req, res, vkUser, "vk_miniapp");
  } catch (error) {
    console.error("/auth/vk-miniapp error:", error.message);
    return res.status(401).json({
      ok: false,
      error: error.message || "Не удалось авторизоваться через VK Mini App",
      needsVkMiniAppSecret: !VK_MINI_APP_SECRET,
    });
  }
});

app.post("/auth/vk/start", async (req, res) => {
  try {
    const returnTo = req.body?.returnTo || "profile";
    const { state, codeChallenge } = await createVkIdState(returnTo);
    const scope = String(req.body?.scope || "vkid.personal_info email phone");

    const url = new URL(VK_ID_AUTH_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", VK_ID_CLIENT_ID);
    url.searchParams.set("redirect_uri", VK_ID_REDIRECT_URI);
    url.searchParams.set("scope", scope);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("prompt", "login");

    return res.json({
      ok: true,
      authUrl: url.toString(),
      state,
      redirectUri: VK_ID_REDIRECT_URI,
    });
  } catch (error) {
    console.error("/auth/vk/start error:", error.message);
    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось начать VK ID вход",
    });
  }
});

app.post("/auth/vk/callback", async (req, res) => {
  try {
    const { code, state, deviceId } = req.body || {};
    const vkState = await readAndDeleteVkIdState(state);
    const tokens = await exchangeVkIdCode(code, deviceId, vkState.codeVerifier);
    const rawUser = await fetchVkIdUserInfo(tokens.access_token);
    const vkUser = normalizeVkIdUser(rawUser, tokens);

    return await sendVkAuthResponse(req, res, vkUser, "website_vk");
  } catch (error) {
    console.error("/auth/vk/callback error:", error.message);
    return res.status(401).json({
      ok: false,
      error: error.message || "Не удалось завершить VK ID вход",
    });
  }
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


async function readVkNotificationSession(req) {
  const { profile } = await readAuthSession(req.body?.sessionToken);

  if (!isVkProfile(profile)) {
    const error = new Error("Уведомления ВКонтакте доступны только для профилей, вошедших через VK");
    error.statusCode = 403;
    throw error;
  }

  if (!profile.vkId) {
    const error = new Error("В профиле нет vkId. Выйдите и войдите через VK заново.");
    error.statusCode = 400;
    throw error;
  }

  return {
    profile,
    userRef: db.collection("users").doc(String(profile.userId || profile.id)),
  };
}

function vkNotificationPayload(profile, checkResult, extra = {}) {
  return {
    ok: true,
    isVkProfile: true,
    communityId: VK_COMMUNITY_ID || "",
    configured: Boolean(VK_COMMUNITY_ID),
    canCheck: Boolean(VK_COMMUNITY_ID && VK_COMMUNITY_TOKEN),
    connectUrl: buildVkCommunityWriteUrl(),
    isAllowed: Boolean(checkResult?.isAllowed || profile?.vkCommunityMessagesAllowed),
    status:
      checkResult?.isAllowed || profile?.vkCommunityMessagesAllowed
        ? "allowed"
        : !VK_COMMUNITY_ID
        ? "needs_community_id"
        : !VK_COMMUNITY_TOKEN
        ? "needs_community_token"
        : "not_allowed",
    ...extra,
  };
}

app.post("/vk/community/status", async (req, res) => {
  try {
    const { profile, userRef } = await readVkNotificationSession(req);
    let checkResult = null;

    if (VK_COMMUNITY_ID && VK_COMMUNITY_TOKEN) {
      checkResult = await checkVkCommunityMessagesAllowed(profile.vkId);
      await updateVkCommunityNotificationStatus(userRef, checkResult);
    }

    return res.json(vkNotificationPayload(profile, checkResult));
  } catch (error) {
    console.error("/vk/community/status error:", error.message);
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Не удалось проверить VK-уведомления",
    });
  }
});

app.post("/vk/community/connect", async (req, res) => {
  try {
    const { profile, userRef } = await readVkNotificationSession(req);
    const connectUrl = buildVkCommunityWriteUrl();

    if (!VK_COMMUNITY_ID) {
      return res.status(500).json({
        ok: false,
        error: "VK_COMMUNITY_ID не настроен на сервере",
      });
    }

    const initialPatch = {
      vkCommunityId: VK_COMMUNITY_ID,
      vkCommunityWriteUrl: connectUrl,
      vkNotificationStatus: profile?.vkCommunityMessagesAllowed ? "allowed" : "open_dialog_required",
      vkNotificationsRequestedAt: Date.now(),
      updatedAt: Date.now(),
    };

    await userRef.set(initialPatch, { merge: true });

    let checkResult = null;
    if (VK_COMMUNITY_TOKEN) {
      checkResult = await checkVkCommunityMessagesAllowed(profile.vkId);
      await updateVkCommunityNotificationStatus(userRef, checkResult, {
        vkNotificationsRequestedAt: initialPatch.vkNotificationsRequestedAt,
      });
    }

    return res.json(
      vkNotificationPayload(profile, checkResult, {
        connectUrl,
        message: checkResult?.isAllowed
          ? "Уведомления ВКонтакте уже подключены"
          : "Откройте диалог с сообществом и разрешите сообщения, затем вернитесь и нажмите Проверить",
      })
    );
  } catch (error) {
    console.error("/vk/community/connect error:", error.message);
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Не удалось начать подключение VK-уведомлений",
    });
  }
});

app.post("/vk/community/check", async (req, res) => {
  try {
    const { profile, userRef } = await readVkNotificationSession(req);
    const checkResult = await checkVkCommunityMessagesAllowed(profile.vkId);
    await updateVkCommunityNotificationStatus(userRef, checkResult);

    return res.json(
      vkNotificationPayload(profile, checkResult, {
        message: checkResult.isAllowed
          ? "Уведомления ВКонтакте подключены"
          : "Сообщество пока не может отправлять вам сообщения",
      })
    );
  } catch (error) {
    console.error("/vk/community/check error:", error.message);
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Не удалось проверить разрешение сообщений ВК",
    });
  }
});

app.post("/vk/community/test", async (req, res) => {
  try {
    const { profile, userRef } = await readVkNotificationSession(req);
    const checkResult = await checkVkCommunityMessagesAllowed(profile.vkId);
    await updateVkCommunityNotificationStatus(userRef, checkResult);

    if (!checkResult.isAllowed) {
      return res.status(403).json({
        ok: false,
        error: "Сначала разрешите сообщения от сообщества ВКонтакте",
        connectUrl: checkResult.connectUrl,
      });
    }

    const result = await sendVkCommunityMessage(
      profile.vkId,
      "✅ Уведомления Барахолки во ВКонтакте подключены. Теперь сюда будут приходить важные уведомления о чатах и модерации.",
      { url: WEB_APP_URL }
    );

    return res.json({ ok: true, notification: result });
  } catch (error) {
    console.error("/vk/community/test error:", error.message);
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Не удалось отправить тестовое VK-уведомление",
    });
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


app.post("/notify-chat-message", async (req, res) => {
  try {
    const { chatId, messageId } = req.body || {};

    if (!chatId || !messageId) {
      return res.status(400).json({ ok: false, error: "Не хватает chatId или messageId" });
    }

    const chatRef = db.collection("chats").doc(String(chatId));
    const [chatSnap, messageSnap] = await Promise.all([
      chatRef.get(),
      chatRef.collection("messages").doc(String(messageId)).get(),
    ]);

    if (!chatSnap.exists || !messageSnap.exists) {
      return res.status(404).json({ ok: false, error: "Диалог или сообщение не найдено" });
    }

    const chat = chatSnap.data();
    const message = messageSnap.data();
    const senderId = String(message.senderId || "");
    const buyerId = String(chat.buyerId || "");
    const sellerId = String(chat.sellerId || "");
    const recipientId = senderId === buyerId ? sellerId : buyerId;

    if (!recipientId || recipientId === senderId) {
      return res.json({ ok: true, skipped: true });
    }

    const preview = String(message.text || "").slice(0, 500);
    const text = `💬 Новое сообщение по объявлению\n\n📌 ${chat.adTitle || "Объявление"}\n\n${preview}`;
    const result = await sendUserNotification(recipientId, text, "chatMessages", {
      reply_markup: {
        inline_keyboard: [[{ text: "Открыть чат", web_app: { url: buildMiniAppChatUrl(chatId) } }]],
      },
    });

    return res.json({ ok: true, notification: result });
  } catch (error) {
    console.error("/notify-chat-message error:", error);
    return res.status(500).json({ ok: false, error: error.message || "Не удалось отправить уведомление" });
  }
});

app.post("/new-ad", async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: "BOT_TOKEN не настроен на Render",
      });
    }

    if (!ADMIN_ID || !Number.isFinite(ADMIN_ID)) {
      return res.status(500).json({
        ok: false,
        error: "ADMIN_ID не настроен на Render или имеет неверный формат",
      });
    }

    const ad = req.body;

    const imageUrls =
      Array.isArray(ad?.imageUrls) && ad.imageUrls.length > 0
        ? ad.imageUrls.filter(Boolean)
        : ad?.imageUrl
        ? [ad.imageUrl]
        : [];

    if (!ad?.id || !ad?.title || !ad?.price || !ad?.description || imageUrls.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Не хватает данных объявления",
      });
    }

    const TELEGRAM_CAPTION_SAFE_LIMIT = 900;
    const TELEGRAM_MESSAGE_SAFE_LIMIT = 3500;

    const toTelegramSafeText = (value, maxLength) => {
      const normalized = String(value ?? "").trim();
      const chars = Array.from(normalized);

      if (chars.length <= maxLength) {
        return normalized;
      }

      return `${chars.slice(0, Math.max(0, maxLength - 1)).join("")}…`;
    };

    const splitTelegramMessage = (value, maxLength = TELEGRAM_MESSAGE_SAFE_LIMIT) => {
      const chars = Array.from(String(value ?? ""));
      const chunks = [];

      for (let index = 0; index < chars.length; index += maxLength) {
        chunks.push(chars.slice(index, index + maxLength).join(""));
      }

      return chunks.length > 0 ? chunks : [""];
    };

    const headerText = `📦 Новое объявление

🆔 ${ad.id}
📌 ${ad.title}
🗂 Категория: ${ad.category || "Без категории"}
💰 ${ad.price} ₽`;

    // В подписи к фото держим только короткую шапку объявления.
    // Полное описание отправляется отдельным сообщением ниже, чтобы не дублировать текст
    // и не упираться в лимит caption у Telegram.
    const caption = toTelegramSafeText(headerText, TELEGRAM_CAPTION_SAFE_LIMIT);

    const fullText = `📝 Полное описание:
${ad.description}`;
    const fullTextChunks = splitTelegramMessage(fullText);

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Принять", callback_data: `approve_${ad.id}` },
            { text: "❌ Отклонить", callback_data: `reject_${ad.id}` },
          ],
        ],
      },
    };

    if (imageUrls.length > 1) {
      const media = imageUrls.map((url, index) => ({
        type: "photo",
        media: url,
        ...(index === 0 ? { caption } : {}),
      }));

      await bot.sendMediaGroup(ADMIN_ID, media);
    } else {
      await bot.sendPhoto(ADMIN_ID, imageUrls[0], {
        caption,
      });
    }

    for (let index = 0; index < fullTextChunks.length; index += 1) {
      const isLastChunk = index === fullTextChunks.length - 1;

      await bot.sendMessage(
        ADMIN_ID,
        fullTextChunks[index],
        isLastChunk ? keyboard : undefined
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Ошибка /new-ad:", {
      message: error.message,
      code: error.code,
      response: error.response?.body || error.response,
    });

    return res.status(500).json({
      ok: false,
      error: error.message || "Не удалось отправить объявление в Telegram",
      telegramError: error.response?.body || null,
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
        await sendUserNotification(
          ad.userId,
          `✅ Ваше объявление "${ad.title}" опубликовано!`,
          "moderation"
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
        await sendUserNotification(
          ad.userId,
          `❌ Ваше объявление "${ad.title}" отклонено.`,
          "moderation"
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