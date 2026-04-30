import { useEffect } from "react";

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

  // В fullscreen на iOS Telegram может отдавать safeAreaInset, а WebKit параллельно
  // отдаёт тот же самый вырез через env(safe-area-inset-*). CSS проекта местами
  // складывает env + tg vars, поэтому сырые значения дают двойной верхний отступ.
  // Здесь оставляем в Telegram-переменных только ту часть, которой НЕ покрывает env().
  const effectiveSafe = Math.max(safe, env);
  const safeExtra = Math.max(0, effectiveSafe - env);

  // contentSafeAreaInset иногда приходит как полный верхний safe-area, а иногда как
  // дополнительная зона внутри safe-area. Чтобы не складывать одно и то же дважды,
  // учитываем только реальный остаток поверх max(safe, env).
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

function applyTelegramViewportVars() {
  const tg = window.Telegram?.WebApp;
  const root = document.documentElement;

  const rawSafeTop = readTelegramInset(tg?.safeAreaInset, "top");
  const rawSafeBottom = readTelegramInset(tg?.safeAreaInset, "bottom");
  const rawContentTop = readTelegramInset(tg?.contentSafeAreaInset, "top");
  const rawContentBottom = readTelegramInset(tg?.contentSafeAreaInset, "bottom");
  const envTop = readCssSafeAreaInset("top");
  const envBottom = readCssSafeAreaInset("bottom");
  const viewportHeight = getSafeViewportHeight(tg);

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
  root.style.setProperty("--app-safe-top", `${top.appExtra}px`);
  root.style.setProperty("--app-safe-bottom", `${bottom.appExtra}px`);

  root.style.setProperty("--tg-raw-safe-top", `${rawSafeTop}px`);
  root.style.setProperty("--tg-raw-safe-bottom", `${rawSafeBottom}px`);
  root.style.setProperty("--ios-env-safe-top", `${envTop}px`);
  root.style.setProperty("--ios-env-safe-bottom", `${envBottom}px`);

  if (tg?.isFullscreen || rawSafeTop + rawSafeBottom + rawContentTop + rawContentBottom > 0) {
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
    window.visualViewport?.addEventListener?.("scroll", handleResize, { passive: true });
    tg?.onEvent?.("viewportChanged", handleViewportChanged);
    tg?.onEvent?.("safeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("contentSafeAreaChanged", handleSafeAreaChanged);
    tg?.onEvent?.("fullscreenChanged", handleSafeAreaChanged);

    const timers = [80, 350, 900, 1800].map((delay) => window.setTimeout(applyTelegramViewportVars, delay));

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
