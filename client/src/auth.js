const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "https://miniapp-1wzi.onrender.com";

export const BOT_USERNAME =
  import.meta.env.VITE_BOT_USERNAME || "baraholka_miniapp_bot";

const SESSION_KEY = "baraholka_auth_session_v1";
const OIDC_RETURN_PAGE_KEY = "baraholka_oidc_return_page_v1";

function normalizeUserId(value) {
  if (value === undefined || value === null || value === "") return null;

  const raw = String(value);

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isSafeInteger(numeric)) return numeric;
  }

  return raw;
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    id: normalizeUserId(user.id || user.userId || user.uid),
    first_name: user.first_name || user.firstName || user.name || "",
    last_name: user.last_name || user.lastName || "",
    username: user.username || user.preferred_username || user.domain || "",
    photo_url: user.photo_url || user.photoUrl || user.telegramAvatarUrl || user.vkAvatarUrl || user.picture || user.avatarUrl || "",
    phone_number: user.phone_number || user.phoneNumber || user.phone || "",
    isVerified: Boolean(user.isVerified || user.verified),
    authProvider: user.authProvider || user.provider || "telegram",
  };
}

function saveSession(payload) {
  if (!payload?.sessionToken) return;

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: payload.sessionToken,
      user: normalizeUser(payload.user),
      savedAt: Date.now(),
    })
  );
}

export function getStoredAuthSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getOidcReturnPage() {
  return sessionStorage.getItem(OIDC_RETURN_PAGE_KEY) || "profile";
}

export function consumeOidcReturnPage() {
  const page = getOidcReturnPage();
  sessionStorage.removeItem(OIDC_RETURN_PAGE_KEY);
  return page;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isRetryableAuthError(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    name === "AbortError" ||
    message.includes("aborted") ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("load failed")
  );
}

function normalizeAuthError(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || "");

  if (name === "AbortError" || message.toLowerCase().includes("aborted")) {
    const normalized = new Error("Сервер авторизации не успел ответить. Попробуйте ещё раз через несколько секунд.");
    normalized.retryable = true;
    return normalized;
  }

  if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("load failed")) {
    const normalized = new Error("Не удалось подключиться к серверу авторизации. Проверьте интернет и повторите вход.");
    normalized.retryable = true;
    return normalized;
  }

  return error instanceof Error ? error : new Error(message || "Ошибка авторизации");
}

async function fetchJsonWithTimeout(path, body, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });

    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("Сервер авторизации вернул некорректный ответ");
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Ошибка авторизации");
    }

    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

async function postJson(path, body, timeoutMs = 16000) {
  const attempts = Math.max(1, path.includes("/auth/oidc") ? 3 : 2);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJsonWithTimeout(path, body, timeoutMs + (attempt - 1) * 7000);
    } catch (error) {
      lastError = error;
      if (!isRetryableAuthError(error) || attempt === attempts) break;
      await sleep(450 * attempt);
    }
  }

  throw normalizeAuthError(lastError);
}

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || "";
}

export function getTelegramUnsafeUser() {
  return normalizeUser(window.Telegram?.WebApp?.initDataUnsafe?.user || null);
}

export async function authenticateMiniAppInitData(initData) {
  if (!initData) return null;

  const data = await postJson("/auth/miniapp", { initData });
  saveSession(data);

  return {
    ...data,
    user: normalizeUser(data.user),
  };
}

export async function authenticateTelegramLogin(telegramUser) {
  if (!telegramUser?.id || !telegramUser?.hash) {
    throw new Error("Telegram не передал данные входа");
  }

  const data = await postJson("/auth/telegram-login", { user: telegramUser });
  saveSession(data);

  return {
    ...data,
    user: normalizeUser(data.user),
  };
}

export async function startTelegramOidcLogin(returnPage = "profile") {
  sessionStorage.setItem(OIDC_RETURN_PAGE_KEY, returnPage || "profile");

  const data = await postJson(
    "/auth/oidc/start",
    {
      returnTo: returnPage || "profile",
      // Минимальный набор прав: профиль. Телефон и bot_access можно добавить позже в уведомлениях.
      scope: "openid profile",
    },
    22000
  );

  if (!data?.authUrl) {
    throw new Error("Сервер не вернул ссылку Telegram OpenID Connect");
  }

  window.location.assign(data.authUrl);
}

export async function completeTelegramOidcLogin({ code, state }) {
  if (!code || !state) {
    throw new Error("Telegram не вернул данные для завершения входа");
  }

  const data = await postJson("/auth/oidc/callback", { code, state }, 28000);
  saveSession(data);

  return {
    ...data,
    user: normalizeUser(data.user),
  };
}

export async function startVkIdLogin(returnPage = "profile") {
  sessionStorage.setItem(OIDC_RETURN_PAGE_KEY, returnPage || "profile");

  const data = await postJson(
    "/auth/vk/start",
    {
      returnTo: returnPage || "profile",
      scope: "vkid.personal_info email phone",
    },
    22000
  );

  if (!data?.authUrl) {
    throw new Error("Сервер не вернул ссылку VK ID");
  }

  window.location.assign(data.authUrl);
}

export async function completeVkIdLogin({ code, state, deviceId }) {
  if (!code || !state) {
    throw new Error("VK ID не вернул данные для завершения входа");
  }

  const data = await postJson(
    "/auth/vk/callback",
    { code, state, deviceId },
    28000
  );
  saveSession(data);

  return {
    ...data,
    user: normalizeUser(data.user),
  };
}

export async function authenticateTelegramOidcToken(idToken) {
  if (!idToken) {
    throw new Error("Telegram не передал id_token");
  }

  const data = await postJson("/auth/oidc/token", { idToken }, 10000);
  saveSession(data);

  return {
    ...data,
    user: normalizeUser(data.user),
  };
}

export async function restoreAuthSession() {
  const saved = getStoredAuthSession();
  if (!saved?.token) return null;

  try {
    const data = await postJson("/auth/session", { sessionToken: saved.token }, 12000);
    saveSession({ ...data, sessionToken: saved.token });

    return {
      ...data,
      sessionToken: saved.token,
      user: normalizeUser(data.user),
    };
  } catch (error) {
    if (!error?.retryable) {
      clearStoredAuthSession();
    }
    throw error;
  }
}

export async function logoutAuthSession() {
  const saved = getStoredAuthSession();

  try {
    if (saved?.token) {
      await postJson("/auth/logout", { sessionToken: saved.token }, 4000);
    }
  } finally {
    clearStoredAuthSession();
  }
}
