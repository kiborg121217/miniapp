export function isVkMiniAppRuntime() {
  if (typeof window === "undefined") return false;

  const href = String(window.location.href || "");
  const search = String(window.location.search || "");
  const hash = String(window.location.hash || "");
  const referrer = String(document.referrer || "");
  const ua = String(navigator.userAgent || "");

  return Boolean(
    /[?&]vk_app_id=/.test(search) ||
      /[?#&]vk_app_id=/.test(hash) ||
      /vk_platform=|vk_user_id=|sign=/.test(href) ||
      /(^|\.)vk\.com|(^|\.)vk\.ru|(^|\.)m\.vk\.com|(^|\.)m\.vk\.ru/.test(referrer) ||
      /VKAndroidApp|VK\/|VKontakte/i.test(ua)
  );
}

export function readVkLaunchParams() {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams();
  const append = (source) => {
    if (!source) return;
    const raw = String(source).replace(/^[?#]/, "");
    if (!raw) return;
    const parsed = new URLSearchParams(raw);
    parsed.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  };

  append(window.location.search);
  append(window.location.hash);

  return Object.fromEntries(params.entries());
}

export function markVkMiniAppRuntime() {
  if (typeof document === "undefined") return false;
  const enabled = isVkMiniAppRuntime();
  if (enabled) {
    document.documentElement.dataset.vkMiniApp = "true";
  } else {
    delete document.documentElement.dataset.vkMiniApp;
  }
  return enabled;
}

function getBridge() {
  if (typeof window === "undefined") return null;
  return window.vkBridge || window.VKBridge || null;
}

let bridgeScriptPromise = null;

export async function loadVkBridge() {
  if (typeof window === "undefined") return null;

  const existing = getBridge();
  if (existing?.send) return existing;

  if (!bridgeScriptPromise) {
    bridgeScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js";
      script.async = true;
      script.onload = () => resolve(getBridge());
      script.onerror = () => reject(new Error("Не удалось загрузить VK Bridge"));
      document.head.appendChild(script);
    });
  }

  return bridgeScriptPromise;
}

export async function initVkBridge() {
  if (!isVkMiniAppRuntime()) return null;

  const bridge = await loadVkBridge();
  if (!bridge?.send) return null;

  try {
    await bridge.send("VKWebAppInit");
  } catch (error) {
    console.warn("VKWebAppInit failed", error);
  }

  return bridge;
}

export async function getVkMiniAppUserInfo() {
  const bridge = await initVkBridge();
  if (!bridge?.send) {
    throw new Error("VK Bridge недоступен");
  }
  return bridge.send("VKWebAppGetUserInfo");
}

// Backward-compatible exports used by SettingsPage.jsx from VK notifications stage.
export function isVkMiniAppLaunch() {
  return isVkMiniAppRuntime();
}

export function getVkLaunchQueryString() {
  if (typeof window === "undefined") return "";
  const launchParams = readVkLaunchParams();
  const params = new URLSearchParams();
  Object.entries(launchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export async function getVkBridge() {
  return await initVkBridge();
}

export async function requestVkCommunityMessagesViaBridge(communityId) {
  const groupId = Number(String(communityId || "").replace(/^-/, ""));
  if (!groupId) {
    throw new Error("VK-сообщество не настроено");
  }

  const bridge = await initVkBridge();
  if (!bridge?.send) {
    throw new Error("VK Bridge недоступен. Откройте приложение внутри ВКонтакте.");
  }

  return bridge.send("VKWebAppAllowMessagesFromGroup", { group_id: groupId });
}
