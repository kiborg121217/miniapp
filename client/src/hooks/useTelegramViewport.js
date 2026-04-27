import { useEffect } from "react";

function readTelegramInset(inset, key) {
  const value = inset?.[key];
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function applyTelegramViewportVars() {
  const tg = window.Telegram?.WebApp;
  const root = document.documentElement;

  const safeTop = readTelegramInset(tg?.safeAreaInset, "top");
  const safeBottom = readTelegramInset(tg?.safeAreaInset, "bottom");
  const contentTop = readTelegramInset(tg?.contentSafeAreaInset, "top");
  const contentBottom = readTelegramInset(tg?.contentSafeAreaInset, "bottom");

  const viewportHeight = Number.isFinite(tg?.viewportHeight)
    ? Math.max(0, tg.viewportHeight)
    : window.innerHeight;

  const stableViewportHeight = Number.isFinite(tg?.viewportStableHeight)
    ? Math.max(0, tg.viewportStableHeight)
    : viewportHeight;

  root.style.setProperty("--tg-safe-top", `${safeTop}px`);
  root.style.setProperty("--tg-safe-bottom", `${safeBottom}px`);
  root.style.setProperty("--tg-content-safe-top", `${contentTop}px`);
  root.style.setProperty("--tg-content-safe-bottom", `${contentBottom}px`);
  root.style.setProperty("--tg-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--tg-stable-viewport-height", `${stableViewportHeight}px`);

  const totalTop = safeTop + contentTop;
  const totalBottom = safeBottom + contentBottom;

  root.style.setProperty("--app-safe-top", `${totalTop}px`);
  root.style.setProperty("--app-safe-bottom", `${totalBottom}px`);

  if (tg?.isFullscreen || totalTop > 0 || totalBottom > 0) {
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
      tg?.requestFullscreen?.();
    } catch {
      // Старые клиенты Telegram могут не поддерживать fullscreen API.
    }

    applyTelegramViewportVars();

    const handleResize = () => applyTelegramViewportVars();
    const handleViewportChanged = () => applyTelegramViewportVars();
    const handleSafeAreaChanged = () => applyTelegramViewportVars();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    tg?.onEvent?.("viewportChanged", handleViewportChanged);
    tg?.onEvent?.("safeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);

    const timer = window.setTimeout(applyTelegramViewportVars, 300);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      tg?.offEvent?.("viewportChanged", handleViewportChanged);
      tg?.offEvent?.("safeAreaChanged", handleSafeAreaChanged);
      tg?.offEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
      window.clearTimeout(timer);
    };
  }, []);
}
