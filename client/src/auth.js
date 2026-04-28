const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "https://miniapp-1wzi.onrender.com";

export const BOT_USERNAME =
  import.meta.env.VITE_BOT_USERNAME || "baraholka_miniapp_bot";

const SESSION_KEY = "baraholka_auth_session_v1";
const OIDC_RETURN_PAGE_KEY = "baraholka_oidc_return_page_v1";

function normalizeUser(user) {
  if (!user) return null;

  return {
    id: Number(user.id),
    first_name: user.first_name || user.firstName || user.name || "",
    last_name: user.last_name || user.lastName || "",
    username: user.username || user.preferred_username || "",
    photo_url: user.photo_url || user.photoUrl || user.telegramAvatarUrl || user.picture || "",
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

async function postJson(path, body, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
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
    8000
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

  const data = await postJson("/auth/oidc/callback", { code, state }, 14000);
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
    const data = await postJson("/auth/session", { sessionToken: saved.token }, 6500);
    saveSession({ ...data, sessionToken: saved.token });

    return {
      ...data,
      sessionToken: saved.token,
      user: normalizeUser(data.user),
    };
  } catch (error) {
    clearStoredAuthSession();
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
