import { logDebugEvent } from "./debugLog";

const VK_BRIDGE_CDN_URL = "https://unpkg.com/@vkontakte/vk-bridge@2.15.12/dist/browser.min.js";

let bridgeLoadPromise = null;
let initPromise = null;
let cachedInfo = null;

function getSearchParams() {
  try {
    return new URLSearchParams(window.location.search || "");
  } catch {
    return new URLSearchParams();
  }
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
      params.get("sign")
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

function loadVkBridgeScript() {
  if (window.vkBridge?.send) return Promise.resolve(window.vkBridge);
  if (bridgeLoadPromise) return bridgeLoadPromise;

  bridgeLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-vk-bridge='true']");

    if (existing) {
      existing.addEventListener("load", () => resolve(window.vkBridge), { once: true });
      existing.addEventListener("error", () => reject(new Error("Не удалось загрузить VK Bridge")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = VK_BRIDGE_CDN_URL;
    script.async = true;
    script.defer = true;
    script.dataset.vkBridge = "true";
    script.onload = () => {
      if (window.vkBridge?.send) resolve(window.vkBridge);
      else reject(new Error("VK Bridge загружен, но объект vkBridge недоступен"));
    };
    script.onerror = () => reject(new Error("Не удалось загрузить VK Bridge"));
    document.head.appendChild(script);
  });

  return bridgeLoadPromise;
}

export async function getVkBridge() {
  if (!isVkMiniAppLaunch()) return null;
  return await loadVkBridgeScript();
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

    let bridge = null;
    let user = null;
    let config = null;
    let initOk = false;

    try {
      bridge = await loadVkBridgeScript();
      await bridge.send("VKWebAppInit");
      initOk = true;
      logDebugEvent("vk_bridge_init_success");
    } catch (error) {
      logDebugEvent("vk_bridge_init_error", error);
    }

    if (bridge?.send) {
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

  const bridge = await getVkBridge();
  if (!bridge?.send) {
    throw new Error("VK Bridge недоступен. Откройте приложение внутри ВКонтакте.");
  }

  return await bridge.send("VKWebAppAllowMessagesFromGroup", { group_id: groupId });
}
