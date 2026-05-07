const TELEGRAM_SDK_URL = "https://telegram.org/js/telegram-web-app.js";

let telegramSdkPromise = null;

function collectTelegramParamSources() {
  const sources = [];

  try {
    sources.push(window.location.search || "");
  } catch {
    // ignore
  }

  try {
    const hash = String(window.location.hash || "");
    if (hash) {
      const normalizedHash = hash.replace(/^#\/?/, "");
      sources.push(normalizedHash.includes("?") ? normalizedHash.slice(normalizedHash.indexOf("?")) : normalizedHash);
    }
  } catch {
    // ignore
  }

  return sources;
}

function readTelegramLaunchParams() {
  const merged = new URLSearchParams();

  for (const source of collectTelegramParamSources()) {
    const raw = String(source || "").replace(/^#/, "").replace(/^\?/, "");
    if (!raw) continue;

    try {
      const params = new URLSearchParams(raw);
      for (const [key, value] of params.entries()) {
        if (key.startsWith("tgWebApp")) merged.set(key, value);
      }
    } catch {
      // ignore malformed source
    }
  }

  return merged;
}

export function getTelegram() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp || null;
}

export function readTelegramInitDataFromLocation() {
  try {
    return readTelegramLaunchParams().get("tgWebAppData") || "";
  } catch {
    return "";
  }
}

export function readTelegramUnsafeUserFromLocation() {
  try {
    const initData = readTelegramInitDataFromLocation();
    if (!initData) return null;

    const params = new URLSearchParams(initData);
    const rawUser = params.get("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

export function isLikelyTelegramLaunch() {
  try {
    if (getTelegram()) return true;
    const params = readTelegramLaunchParams();
    if (params.get("tgWebAppData") || params.get("tgWebAppStartParam")) return true;
    if (/t\.me|telegram\.org/i.test(document.referrer || "")) return true;
    if (/Telegram|TelegramBot|TDesktop/i.test(navigator.userAgent || "")) return true;
  } catch {
    // ignore
  }

  return false;
}

export async function ensureTelegramSdkLoaded({ force = false, timeoutMs = 3000 } = {}) {
  if (typeof window === "undefined") return null;
  if (getTelegram()) return getTelegram();
  if (!force && !isLikelyTelegramLaunch()) return null;
  if (telegramSdkPromise) return telegramSdkPromise;

  telegramSdkPromise = new Promise((resolve) => {
    const finish = () => resolve(getTelegram());
    const timer = window.setTimeout(finish, timeoutMs);
    const existing = document.querySelector("script[data-telegram-web-app='true'], script[src='https://telegram.org/js/telegram-web-app.js']");

    const complete = () => {
      window.clearTimeout(timer);
      finish();
    };

    if (existing) {
      existing.addEventListener("load", complete, { once: true });
      existing.addEventListener("error", complete, { once: true });
      if (getTelegram()) complete();
      return;
    }

    const script = document.createElement("script");
    script.src = TELEGRAM_SDK_URL;
    script.async = true;
    script.defer = true;
    script.dataset.telegramWebApp = "true";
    script.onload = complete;
    script.onerror = complete;
    document.head.appendChild(script);
  });

  return telegramSdkPromise;
}

export async function initTelegram() {
  const tg = await ensureTelegramSdkLoaded({ timeoutMs: 2500 });

  if (tg) {
    try {
      tg.ready?.();
      tg.expand?.();
    } catch {
      // Старые клиенты Telegram могут поддерживать только часть API.
    }

    console.log("Telegram init OK");
    console.log("USER:", tg.initDataUnsafe?.user);
  } else {
    console.log("НЕ Telegram");
  }

  return tg;
}

export function getUser() {
  const tg = getTelegram();
  const fallbackUser = readTelegramUnsafeUserFromLocation();

  if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;
  if (fallbackUser) return fallbackUser;

  return null;
}

export function requestBotWriteAccess() {
  const tg = getTelegram();

  return new Promise((resolve, reject) => {
    if (!tg?.requestWriteAccess) {
      resolve(false);
      return;
    }

    try {
      const result = tg.requestWriteAccess((allowed) => {
        resolve(Boolean(allowed));
      });

      if (result && typeof result.then === "function") {
        result.then((allowed) => resolve(Boolean(allowed))).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}
