import { useEffect } from "react";

function isVkMiniAppLaunch() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return Boolean(
      params.get("vk_app_id") ||
        params.get("vk_user_id") ||
        params.get("vk_platform") ||
        params.get("vk_ref") ||
        params.get("sign")
    );
  } catch {
    return false;
  }
}

function readTelegramInset(inset, key) {
  const value = inset?.[key];
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readCssSafeAreaInset(edge) {
  if (typeof document === "undefined") return 0;

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingTop = edge === "top" ? "env(safe-area-inset-top, 0px)" : "0px";
  probe.style.paddingBottom = edge === "bottom" ? "env(safe-area-inset-bottom, 0px)" : "0px";
  document.body.appendChild(probe);

  const styles = window.getComputedStyle(probe);
  const raw = edge === "top" ? styles.paddingTop : styles.paddingBottom;
  probe.remove();

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function normalizeInsetPair({ telegramSafe, telegramContent, cssEnv }) {
  const safe = Math.max(0, telegramSafe || 0);
  const content = Math.max(0, telegramContent || 0);
  const env = Math.max(0, cssEnv || 0);
  const effectiveSafe = Math.max(safe, env);
  const safeExtra = Math.max(0, effectiveSafe - env);
  const contentExtra = Math.max(0, content - effectiveSafe);

  return {
    safeExtra,
    contentExtra,
    appExtra: safeExtra + contentExtra,
  };
}

function getSafeViewportHeight(tg) {
  const candidates = [
    tg?.viewportStableHeight,
    tg?.viewportHeight,
    window.visualViewport?.height,
    window.innerHeight,
  ];

  const value = candidates.find((item) => Number.isFinite(item) && item >= 320);
  return Math.round(value || window.innerHeight || 640);
}

function isRealTelegramWebApp(tg) {
  const platform = String(tg?.platform || "").toLowerCase();
  return Boolean(
    tg?.initData ||
      tg?.initDataUnsafe?.user ||
      (platform && platform !== "unknown" && platform !== "web")
  );
}

function getRuntimeFlags(tg) {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile|Mobi/i.test(ua) || Math.min(window.innerWidth, window.innerHeight) <= 820;
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  const isTelegram = isRealTelegramWebApp(tg);
  const isVkMiniApp = isVkMiniAppLaunch();
  const isLikelyInAppBrowser = /VK|VKontakte|Instagram|FBAN|FBAV|Line|MicroMessenger|YaApp|GSA|CriOS|EdgiOS/i.test(ua);

  return {
    isIOS,
    isAndroid,
    isMobile,
    isStandalone,
    isTelegram,
    isVkMiniApp,
    isLikelyInAppBrowser,
  };
}

function setDatasetFlag(root, name, enabled) {
  if (enabled) {
    root.dataset[name] = "true";
  } else {
    delete root.dataset[name];
  }
}

function getBrowserBottomControls({ envBottom, isTelegram, isStandalone, isVkMiniApp }) {
  if (isTelegram || isStandalone || isVkMiniApp) return 0;

  const base = Math.max(0, envBottom || 0);
  const vv = window.visualViewport;
  if (!vv) return Math.min(10, base);

  const innerHeight = Math.max(1, window.innerHeight || 1);
  const visualHeight = Math.max(1, vv.height || innerHeight);
  const rawGap = innerHeight - visualHeight - (vv.offsetTop || 0);
  const gap = Number.isFinite(rawGap) ? Math.max(0, Math.round(rawGap)) : 0;
  const visualRatio = visualHeight / innerHeight;
  const keyboardLooksOpen = visualHeight < innerHeight * 0.72 || gap > 150;

  if (keyboardLooksOpen) return Math.min(10, base);

  // В iOS/Yandex/VK visualViewport иногда отдаёт большой "bottom gap" даже
  // когда нижняя панель браузера уже скрыта. Если видимая область почти равна
  // layout viewport, считаем, что нижней панели нет, и не поднимаем навигацию.
  if (visualRatio >= 0.86 && gap > 18) return 0;

  // Когда нижняя панель браузера реально видна, даём защитный отступ,
  // но не разрешаем ему задирать навигацию почти в середину экрана.
  return Math.min(24, Math.max(0, gap - 24));
}

function applyTelegramViewportVars() {
  const tg = window.Telegram?.WebApp;
  const root = document.documentElement;
  const flags = getRuntimeFlags(tg);

  const rawSafeTop = readTelegramInset(tg?.safeAreaInset, "top");
  const rawSafeBottom = readTelegramInset(tg?.safeAreaInset, "bottom");
  const rawContentTop = readTelegramInset(tg?.contentSafeAreaInset, "top");
  const rawContentBottom = readTelegramInset(tg?.contentSafeAreaInset, "bottom");
  const envTop = readCssSafeAreaInset("top");
  const envBottom = readCssSafeAreaInset("bottom");
  const viewportHeight = getSafeViewportHeight(tg);
  const browserBottomControls = getBrowserBottomControls({
    envBottom,
    isTelegram: flags.isTelegram,
    isStandalone: flags.isStandalone,
    isVkMiniApp: flags.isVkMiniApp,
  });

  const top = normalizeInsetPair({
    telegramSafe: rawSafeTop,
    telegramContent: rawContentTop,
    cssEnv: envTop,
  });

  const bottom = normalizeInsetPair({
    telegramSafe: rawSafeBottom,
    telegramContent: rawContentBottom,
    cssEnv: envBottom,
  });

  root.style.setProperty("--tg-safe-top", `${top.safeExtra}px`);
  root.style.setProperty("--tg-safe-bottom", `${bottom.safeExtra}px`);
  root.style.setProperty("--tg-content-safe-top", `${top.contentExtra}px`);
  root.style.setProperty("--tg-content-safe-bottom", `${bottom.contentExtra}px`);
  root.style.setProperty("--tg-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--tg-stable-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--app-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--app-safe-top", `${top.appExtra}px`);
  root.style.setProperty("--app-safe-bottom", `${bottom.appExtra}px`);
  root.style.setProperty("--browser-bottom-controls", `${browserBottomControls}px`);

  root.style.setProperty("--tg-raw-safe-top", `${rawSafeTop}px`);
  root.style.setProperty("--tg-raw-safe-bottom", `${rawSafeBottom}px`);
  root.style.setProperty("--tg-raw-content-safe-top", `${rawContentTop}px`);
  root.style.setProperty("--tg-raw-content-safe-bottom", `${rawContentBottom}px`);
  root.style.setProperty("--ios-env-safe-top", `${envTop}px`);
  root.style.setProperty("--ios-env-safe-bottom", `${envBottom}px`);

  setDatasetFlag(root, "telegramApp", flags.isTelegram);
  setDatasetFlag(root, "vkMiniApp", flags.isVkMiniApp);
  setDatasetFlag(root, "standaloneApp", flags.isStandalone);
  setDatasetFlag(root, "mobileBrowser", flags.isMobile && !flags.isStandalone && !flags.isTelegram && !flags.isVkMiniApp);
  setDatasetFlag(root, "iosBrowser", flags.isIOS && !flags.isStandalone && !flags.isTelegram && !flags.isVkMiniApp);
  setDatasetFlag(root, "inappBrowser", flags.isLikelyInAppBrowser && !flags.isTelegram && !flags.isVkMiniApp);

  if (flags.isTelegram && tg?.isFullscreen === true) {
    root.dataset.tgFullscreenSafe = "true";
  } else {
    delete root.dataset.tgFullscreenSafe;
  }
}

export default function useTelegramViewport() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    try {
      tg?.ready?.();
      tg?.expand?.();
    } catch {
      // Старые клиенты Telegram могут поддерживать только часть API.
    }

    applyTelegramViewportVars();

    const handleResize = () => applyTelegramViewportVars();
    const handleViewportChanged = () => applyTelegramViewportVars();
    const handleSafeAreaChanged = () => applyTelegramViewportVars();

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });
    window.visualViewport?.addEventListener?.("resize", handleResize, { passive: true });
    window.visualViewport?.addEventListener?.("scroll", handleResize, { passive: true });
    tg?.onEvent?.("viewportChanged", handleViewportChanged);
    tg?.onEvent?.("safeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("fullscreenChanged", handleSafeAreaChanged);

    const timers = [80, 350, 900, 1800, 3200].map((delay) => window.setTimeout(applyTelegramViewportVars, delay));

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.visualViewport?.removeEventListener?.("resize", handleResize);
      window.visualViewport?.removeEventListener?.("scroll", handleResize);
      tg?.offEvent?.("viewportChanged", handleViewportChanged);
      tg?.offEvent?.("safeAreaChanged", handleSafeAreaChanged);
      tg?.offEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
      tg?.offEvent?.("fullscreenChanged", handleSafeAreaChanged);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);
}
