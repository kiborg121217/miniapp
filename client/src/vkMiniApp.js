import bridge from "@vkontakte/vk-bridge";
import { logDebugEvent } from "./debugLog";

let initPromise = null;
let cachedInfo = null;
let earlyInitStarted = false;

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
    if (/vk\.com|m\.vk\.com|vk-apps\.com|vk\.ru|m\.vk\.ru/i.test(document.referrer || "")) return true;
  } catch {
    // ignore
  }

  try {
    const origins = Array.from(window.location.ancestorOrigins || []);
    if (origins.some((origin) => /vk\.com|m\.vk\.com|vk-apps\.com|vk\.ru|m\.vk\.ru/i.test(origin))) return true;
  } catch {
    // ignore
  }

  try {
    if (/VKClient|VKAndroidApp|VKIOS|VKontakte/i.test(navigator.userAgent || "")) return true;
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
  const root = document.documentElement;
  root.dataset.vkMiniApp = "true";

  const platform = info.platform || info.launchParams?.vk_platform || "";
  if (platform) root.dataset.vkPlatform = String(platform);

  const appId = info.launchParams?.vk_app_id || "";
  if (appId) root.dataset.vkAppId = String(appId);
}

function getSafeBridge() {
  return bridge?.default?.send ? bridge.default : bridge;
}

export async function getVkBridge() {
  if (!isVkMiniAppLaunch()) return null;
  const vkBridge = getSafeBridge();
  return vkBridge?.send ? vkBridge : null;
}

export function initVkMiniAppEarly() {
  if (earlyInitStarted || !isVkMiniAppLaunch()) return;
  earlyInitStarted = true;

  const launchParams = readVkLaunchParams();
  setVkDataset({ launchParams });
  logDebugEvent("vk_miniapp_early_detected", {
    appId: launchParams.vk_app_id || "",
    platform: launchParams.vk_platform || "",
    hasSign: Boolean(launchParams.sign),
  });

  const vkBridge = getSafeBridge();
  if (!vkBridge?.send) {
    logDebugEvent("vk_bridge_early_missing");
    return;
  }

  // Важно вызвать VKWebAppInit как можно раньше, до тяжёлой загрузки React-экрана.
  // Иначе мобильный клиент VK может вести себя как обычный mobile-web контейнер.
  vkBridge
    .send("VKWebAppInit")
    .then(() => logDebugEvent("vk_bridge_early_init_success"))
    .catch((error) => logDebugEvent("vk_bridge_early_init_error", error));
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
    let initOk = false;
    const vkBridge = getSafeBridge();

    try {
      if (!earlyInitStarted && vkBridge?.send) {
        await vkBridge.send("VKWebAppInit");
      }
      initOk = true;
      logDebugEvent("vk_bridge_init_success");
    } catch (error) {
      logDebugEvent("vk_bridge_init_error", error);
    }

    if (vkBridge?.send) {
      try {
        user = await vkBridge.send("VKWebAppGetUserInfo");
        logDebugEvent("vk_bridge_user_info_success", {
          id: user?.id || user?.user_id || "",
          hasPhoto: Boolean(user?.photo_200 || user?.photo_max_orig || user?.avatar),
        });
      } catch (error) {
        logDebugEvent("vk_bridge_user_info_error", error);
      }

      try {
        config = await vkBridge.send("VKWebAppGetConfig");
      } catch {
        config = null;
      }
    }

    cachedInfo = {
      isVkMiniApp: true,
      initOk,
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
