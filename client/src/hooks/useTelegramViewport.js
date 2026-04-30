import { useEffect } from "react";

function readTelegramInset(inset, key) {
  const value = inset?.[key];
  return Number.isFinite(value) ? Math.max(0, value) : 0;
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

function applyTelegramViewportVars() {
  const tg = window.Telegram?.WebApp;
  const root = document.documentElement;

  const safeTop = readTelegramInset(tg?.safeAreaInset, "top");
  const safeBottom = readTelegramInset(tg?.safeAreaInset, "bottom");
  const contentTop = readTelegramInset(tg?.contentSafeAreaInset, "top");
  const contentBottom = readTelegramInset(tg?.contentSafeAreaInset, "bottom");
  const viewportHeight = getSafeViewportHeight(tg);

  root.style.setProperty("--tg-safe-top", `${safeTop}px`);
  root.style.setProperty("--tg-safe-bottom", `${safeBottom}px`);
  root.style.setProperty("--tg-content-safe-top", `${contentTop}px`);
  root.style.setProperty("--tg-content-safe-bottom", `${contentBottom}px`);
  root.style.setProperty("--tg-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--tg-stable-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--app-safe-top", `${safeTop + contentTop}px`);
  root.style.setProperty("--app-safe-bottom", `${safeBottom + contentBottom}px`);

  if (tg?.isFullscreen || safeTop + safeBottom + contentTop + contentBottom > 0) {
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
      // Не вызываем requestFullscreen() из React: на части iOS-клиентов Telegram
      // повторный вызов приводит к повторному пересчёту viewport и чёрному экрану.
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
    tg?.onEvent?.("viewportChanged", handleViewportChanged);
    tg?.onEvent?.("safeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("fullscreenChanged", handleSafeAreaChanged);

    const timers = [80, 350, 900, 1800].map((delay) => window.setTimeout(applyTelegramViewportVars, delay));

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.visualViewport?.removeEventListener?.("resize", handleResize);
      tg?.offEvent?.("viewportChanged", handleViewportChanged);
      tg?.offEvent?.("safeAreaChanged", handleSafeAreaChanged);
      tg?.offEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
      tg?.offEvent?.("fullscreenChanged", handleSafeAreaChanged);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);
}
