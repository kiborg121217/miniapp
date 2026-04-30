const DEBUG_LOG_KEY = "baraholka_debug_log_v1";
const MAX_DEBUG_EVENTS = 100;

function safeReadLog() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEBUG_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLog(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(items.slice(-MAX_DEBUG_EVENTS)));
  } catch {
    // ignore storage errors
  }
}

function normalizeDetails(details) {
  if (!details) return null;

  if (details instanceof Error) {
    return {
      name: details.name,
      message: details.message,
      stack: details.stack ? String(details.stack).slice(0, 900) : "",
    };
  }

  try {
    return JSON.parse(JSON.stringify(details, (_key, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack ? String(value.stack).slice(0, 900) : "",
        };
      }
      if (typeof value === "function") return undefined;
      if (typeof value === "string" && value.length > 900) return `${value.slice(0, 900)}…`;
      return value;
    }));
  } catch {
    return String(details).slice(0, 900);
  }
}

export function logDebugEvent(type, details = null) {
  if (typeof window === "undefined") return;

  const tg = window.Telegram?.WebApp;
  const event = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    iso: new Date().toISOString(),
    type,
    path: window.location.pathname,
    search: window.location.search,
    visibility: document.visibilityState,
    details: normalizeDetails(details),
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      vvWidth: Math.round(window.visualViewport?.width || 0),
      vvHeight: Math.round(window.visualViewport?.height || 0),
      vvScale: window.visualViewport?.scale || 1,
    },
    telegram: tg
      ? {
          platform: tg.platform || "",
          version: tg.version || "",
          isExpanded: !!tg.isExpanded,
          isFullscreen: tg.isFullscreen === true,
          viewportHeight: tg.viewportHeight || null,
          viewportStableHeight: tg.viewportStableHeight || null,
          safeTop: tg.safeAreaInset?.top ?? null,
          safeBottom: tg.safeAreaInset?.bottom ?? null,
          contentTop: tg.contentSafeAreaInset?.top ?? null,
          contentBottom: tg.contentSafeAreaInset?.bottom ?? null,
        }
      : null,
  };

  const current = safeReadLog();
  current.push(event);
  safeWriteLog(current);
}

export function getDebugLog() {
  return safeReadLog();
}

export function clearDebugLog() {
  safeWriteLog([]);
}

export function installDebugLogListeners() {
  if (typeof window === "undefined" || window.__baraholkaDebugLogInstalled) return;
  window.__baraholkaDebugLogInstalled = true;

  logDebugEvent("debug_logger_installed", {
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
  });

  window.addEventListener("error", (event) => {
    logDebugEvent("window_error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logDebugEvent("unhandled_rejection", { reason: event.reason });
  });

  window.addEventListener("pagehide", (event) => {
    logDebugEvent("pagehide", { persisted: event.persisted });
  });

  window.addEventListener("pageshow", (event) => {
    logDebugEvent("pageshow", { persisted: event.persisted });
  });

  document.addEventListener("visibilitychange", () => {
    logDebugEvent("visibilitychange", { visibilityState: document.visibilityState });
  });

  window.addEventListener("beforeunload", () => {
    logDebugEvent("beforeunload");
  });
}
