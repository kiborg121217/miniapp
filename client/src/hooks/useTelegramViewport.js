import { useEffect } from "react";

const FULLSCREEN_REQUEST_KEY = "baraholka_tg_fullscreen_requested_v2";

function readTelegramInset(inset, key) {
  const value = Number(inset?.[key]);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function safeSessionGetItem(key) {
  try {
    return window.sessionStorage?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeSessionSetItem(key, value) {
  try {
    window.sessionStorage?.setItem(key, value);
  } catch {
    // ignore unavailable storage
  }
}

function getFallbackViewportHeight() {
  if (typeof window === "undefined") return 640;

  return Math.max(
    360,
    Number(window.innerHeight) || 0,
    Number(document.documentElement?.clientHeight) || 0,
    Number(document.body?.clientHeight) || 0
  );
}

function getUsableViewportHeight(value, fallback = getFallbackViewportHeight()) {
  const numeric = Number(value);

  // Telegram/iOS can briefly report 0 or tiny values during fullscreen transitions.
  // Never expose that value to CSS because it can visually collapse the whole app.
  if (Number.isFinite(numeric) && numeric >= 320) {
    return numeric;
  }

  return Math.max(360, Number(fallback) || 0, getFallbackViewportHeight());
}

function applyTelegramViewportVars() {
  if (typeof window === "undefined") return;

  const tg = window.Telegram?.WebApp;
  const root = document.documentElement;

  const safeTop = readTelegramInset(tg?.safeAreaInset, "top");
  const safeBottom = readTelegramInset(tg?.safeAreaInset, "bottom");
  const contentTop = readTelegramInset(tg?.contentSafeAreaInset, "top");
  const contentBottom = readTelegramInset(tg?.contentSafeAreaInset, "bottom");

  const fallbackHeight = getFallbackViewportHeight();
  const viewportHeight = getUsableViewportHeight(tg?.viewportHeight, fallbackHeight);
  const stableViewportHeight = getUsableViewportHeight(tg?.viewportStableHeight, viewportHeight);

  root.style.setProperty("--tg-safe-top", `${safeTop}px`);
  root.style.setProperty("--tg-safe-bottom", `${safeBottom}px`);
  root.style.setProperty("--tg-content-safe-top", `${contentTop}px`);
  root.style.setProperty("--tg-content-safe-bottom", `${contentBottom}px`);
  root.style.setProperty("--tg-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--tg-stable-viewport-height", `${stableViewportHeight}px`);

  const totalTop = Math.max(safeTop, contentTop);
  const totalBottom = Math.max(safeBottom, contentBottom);

  root.style.setProperty("--app-safe-top", `${totalTop}px`);
  root.style.setProperty("--app-safe-bottom", `${totalBottom}px`);

  if (tg?.isFullscreen || safeTop > 0 || safeBottom > 0 || contentTop > 0 || contentBottom > 0) {
    root.dataset.tgFullscreenSafe = "true";
  } else {
    delete root.dataset.tgFullscreenSafe;
  }
}

function requestTelegramFullscreenOnce(tg) {
  if (!tg?.requestFullscreen) return;

  if (tg.isFullscreen) {
    safeSessionSetItem(FULLSCREEN_REQUEST_KEY, "1");
    return;
  }

  if (window.__BARAHOLKA_TG_FULLSCREEN_REQUESTED) return;
  if (safeSessionGetItem(FULLSCREEN_REQUEST_KEY) === "1") return;

  window.__BARAHOLKA_TG_FULLSCREEN_REQUESTED = true;
  safeSessionSetItem(FULLSCREEN_REQUEST_KEY, "1");

  window.setTimeout(() => {
    try {
      if (!tg.isFullscreen) {
        tg.requestFullscreen();
      }
    } catch {
      // Старые/нестабильные клиенты Telegram могут отказать в fullscreen.
    }

    window.setTimeout(applyTelegramViewportVars, 120);
    window.setTimeout(applyTelegramViewportVars, 420);
  }, 350);
}

export default function useTelegramViewport() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    try {
      tg?.ready?.();
      tg?.expand?.();
    } catch {
      // Telegram API может быть недоступен в обычном браузере.
    }

    applyTelegramViewportVars();

    // iOS/Telegram hotfix: do not request fullscreen from React on every Mini App open.
    // If fullscreen is enabled for the bot, Telegram already opens the WebView in that mode.
    // Re-requesting fullscreen caused a second viewport recalculation on some iPhones.
    // requestTelegramFullscreenOnce(tg);

    const handleResize = () => applyTelegramViewportVars();
    const handleViewportChanged = () => applyTelegramViewportVars();
    const handleSafeAreaChanged = () => applyTelegramViewportVars();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    tg?.onEvent?.("viewportChanged", handleViewportChanged);
    tg?.onEvent?.("safeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("fullscreenChanged", handleSafeAreaChanged);

    const timer1 = window.setTimeout(applyTelegramViewportVars, 300);
    const timer2 = window.setTimeout(applyTelegramViewportVars, 900);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      tg?.offEvent?.("viewportChanged", handleViewportChanged);
      tg?.offEvent?.("safeAreaChanged", handleSafeAreaChanged);
      tg?.offEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
      tg?.offEvent?.("fullscreenChanged", handleSafeAreaChanged);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, []);
}
