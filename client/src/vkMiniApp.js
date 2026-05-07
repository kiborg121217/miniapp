import bridge from "@vkontakte/vk-bridge";
import { logDebugEvent } from "./debugLog";

let bridgeInitPromise = null;
let initPromise = null;
let cachedInfo = null;

function collectVkParamSources() {
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

  try {
    const href = String(window.location.href || "");
    const match = href.match(/[?#&](vk_[^#]+)/);
    if (match?.[1]) sources.push(`?${match[1]}`);
  } catch {
    // ignore
  }

  return sources;
}

function mergeVkParamsFromSources() {
  const merged = new URLSearchParams();

  for (const source of collectVkParamSources()) {
    const raw = String(source || "").replace(/^#/, "").replace(/^\?/, "");
    if (!raw) continue;

    try {
      const params = new URLSearchParams(raw);
      for (const [key, value] of params.entries()) {
        if (key === "sign" || key.startsWith("vk_")) merged.set(key, value);
      }
    } catch {
      // ignore malformed source
    }
  }

  return merged;
}

function getSearchParams() {
  return mergeVkParamsFromSources();
}

function isLikelyOpenedInsideVk() {
  try {
    if (/vk\.com|m\.vk\.com|vk-apps\.com|vk\.ru/i.test(document.referrer || "")) return true;
  } catch {
    // ignore
  }

  try {
    const origins = Array.from(window.location.ancestorOrigins || []);
    if (origins.some((origin) => /vk\.com|m\.vk\.com|vk-apps\.com|vk\.ru/i.test(origin))) return true;
  } catch {
    // ignore
  }

  return false;
}

export function readVkLaunchParams() {
  const params = getSearchParams();
  const result = {};

  for (const [key, value] of params.entries()) {
    if (key === "sign" || key.startsWith("vk_")) {
      result[key] = value;
    }
  }

  return result;
}

export function getVkLaunchQueryString() {
  const params = getSearchParams();
  const filtered = new URLSearchParams();

  for (const [key, value] of params.entries()) {
    if (key === "sign" || key.startsWith("vk_")) {
      filtered.append(key, value);
    }
  }

  return filtered.toString();
}

export function isVkMiniAppLaunch() {
  const params = getSearchParams();
  return Boolean(
    params.get("vk_app_id") ||
      params.get("vk_user_id") ||
      params.get("vk_platform") ||
      params.get("vk_ref") ||
      params.get("sign") ||
      isLikelyOpenedInsideVk()
  );
}

export function getVkMiniAppCachedInfo() {
  return cachedInfo;
}

function setVkDataset(info = {}) {
  try {
    const root = document.documentElement;
    root.dataset.vkMiniApp = "true";

    const platform = info.platform || info.launchParams?.vk_platform || "";
    if (platform) root.dataset.vkPlatform = String(platform);

    const appId = info.launchParams?.vk_app_id || "";
    if (appId) root.dataset.vkAppId = String(appId);
  } catch {
    // ignore DOM errors during very early boot
  }
}

export function sendVkBridgeInitEarly(options = {}) {
  const force = typeof options === "boolean" ? options : Boolean(options?.force);

  // В режиме VK Mini Apps событие VKWebAppInit должно быть отправлено сразу при запуске.
  // Проверка среды через query/referrer/ancestorOrigins не всегда надёжна в VK WebView,
  // поэтому main.jsx вызывает эту функцию с force=true. В обычном браузере bridge
  // просто вернёт ошибку/false, но сайт продолжит работать.
  if (!force && !isVkMiniAppLaunch()) return null;
  if (bridgeInitPromise) return bridgeInitPromise;

  const launchParams = readVkLaunchParams();
  setVkDataset({ launchParams });

  try {
    window.__baraholkaVkBridgeInitStartedAt = Date.now();
  } catch {
    // ignore
  }

  bridgeInitPromise = bridge
    .send("VKWebAppInit")
    .then(() => {
      logDebugEvent("vk_bridge_init_success_early", {
        appId: launchParams.vk_app_id || "",
        platform: launchParams.vk_platform || "",
        hasSign: Boolean(launchParams.sign),
      });
      return true;
    })
    .catch((error) => {
      console.warn("[VK] VKWebAppInit failed", error);
      logDebugEvent("vk_bridge_init_error_early", error);
      return false;
    });

  return bridgeInitPromise;
}

export async function getVkBridge() {
  if (!isVkMiniAppLaunch()) return null;
  return bridge;
}

export async function initVkMiniApp() {
  if (!isVkMiniAppLaunch()) return { isVkMiniApp: false };
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const launchParams = readVkLaunchParams();
    setVkDataset({ launchParams });
    logDebugEvent("vk_miniapp_detected", {
      appId: launchParams.vk_app_id || "",
      platform: launchParams.vk_platform || "",
      hasSign: Boolean(launchParams.sign),
    });

    let user = null;
    let config = null;
    const initOk = await sendVkBridgeInitEarly();

    try {
      user = await bridge.send("VKWebAppGetUserInfo");
      logDebugEvent("vk_bridge_user_info_success", {
        id: user?.id || user?.user_id || "",
        hasPhoto: Boolean(user?.photo_200 || user?.photo_max_orig || user?.avatar),
      });
    } catch (error) {
      logDebugEvent("vk_bridge_user_info_error", error);
    }

    try {
      config = await bridge.send("VKWebAppGetConfig");
    } catch {
      config = null;
    }

    cachedInfo = {
      isVkMiniApp: true,
      initOk: Boolean(initOk),
      launchParams,
      launchQuery: getVkLaunchQueryString(),
      user,
      config,
      platform: launchParams.vk_platform || config?.platform || "",
    };

    setVkDataset(cachedInfo);
    return cachedInfo;
  })();

  return initPromise;
}

export async function requestVkCommunityMessagesViaBridge(communityId) {
  const groupId = Number(String(communityId || "").replace(/^-/, ""));

  if (!groupId) {
    throw new Error("VK-сообщество не настроено");
  }

  const vkBridge = await getVkBridge();
  if (!vkBridge?.send) {
    throw new Error("VK Bridge недоступен. Откройте приложение внутри ВКонтакте.");
  }

  return await vkBridge.send("VKWebAppAllowMessagesFromGroup", { group_id: groupId });
}
