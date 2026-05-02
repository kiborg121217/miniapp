import { useEffect, useState } from "react";
import PageBackButton from "./PageBackButton";
import { getNotificationSettings, updateNotificationSettings } from "../firebase";
import { requestBotWriteAccess } from "../telegram";
import {
  checkVkCommunityNotifications,
  connectVkCommunityNotifications,
  getVkCommunityNotificationStatus,
} from "../auth";

const CHANNEL_URL = "https://t.me/baraholka_channel";

function openChannel() {
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(CHANNEL_URL);
    return;
  }
  window.open(CHANNEL_URL, "_blank", "noopener,noreferrer");
}

function GearIcon() {
  return (
    <svg className="settings-real-gear" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      <path d="M 15 2 C 14.448 2 14 2.448 14 3 L 14 3.171875 C 14 3.649875 13.663406 4.0763437 13.191406 4.1523438 C 12.962406 4.1893437 12.735719 4.2322031 12.511719 4.2832031 C 12.047719 4.3892031 11.578484 4.1265 11.396484 3.6875 L 11.330078 3.53125 C 11.119078 3.02125 10.534437 2.7782344 10.023438 2.9902344 C 9.5134375 3.2012344 9.2704219 3.785875 9.4824219 4.296875 L 9.5488281 4.4570312 C 9.7328281 4.8970313 9.5856875 5.4179219 9.1796875 5.6699219 C 8.9836875 5.7919219 8.7924688 5.9197344 8.6054688 6.0527344 C 8.2174688 6.3297344 7.68075 6.2666875 7.34375 5.9296875 L 7.2226562 5.8085938 C 6.8316562 5.4175937 6.1985937 5.4175938 5.8085938 5.8085938 C 5.4185938 6.1995938 5.4185938 6.8326563 5.8085938 7.2226562 L 5.9296875 7.34375 C 6.2666875 7.68075 6.3297344 8.2164688 6.0527344 8.6054688 C 5.9197344 8.7924687 5.7919219 8.9836875 5.6699219 9.1796875 C 5.4179219 9.5856875 4.8960781 9.7337812 4.4550781 9.5507812 L 4.296875 9.484375 C 3.786875 9.273375 3.2002813 9.5153906 2.9882812 10.025391 C 2.7772813 10.535391 3.0192969 11.120031 3.5292969 11.332031 L 3.6855469 11.396484 C 4.1245469 11.578484 4.3892031 12.047719 4.2832031 12.511719 C 4.2322031 12.735719 4.1873906 12.962406 4.1503906 13.191406 C 4.0753906 13.662406 3.649875 14 3.171875 14 L 3 14 C 2.448 14 2 14.448 2 15 C 2 15.552 2.448 16 3 16 L 3.171875 16 C 3.649875 16 4.0763437 16.336594 4.1523438 16.808594 C 4.1893437 17.037594 4.2322031 17.264281 4.2832031 17.488281 C 4.3892031 17.952281 4.1265 18.421516 3.6875 18.603516 L 3.53125 18.669922 C 3.02125 18.880922 2.7782344 19.465563 2.9902344 19.976562 C 3.2012344 20.486563 3.785875 20.729578 4.296875 20.517578 L 4.4570312 20.451172 C 4.8980312 20.268172 5.418875 20.415312 5.671875 20.820312 C 5.793875 21.016313 5.9206875 21.208484 6.0546875 21.396484 C 6.3316875 21.784484 6.2686406 22.321203 5.9316406 22.658203 L 5.8085938 22.779297 C 5.4175937 23.170297 5.4175938 23.803359 5.8085938 24.193359 C 6.1995938 24.583359 6.8326562 24.584359 7.2226562 24.193359 L 7.3457031 24.072266 C 7.6827031 23.735266 8.2174688 23.670266 8.6054688 23.947266 C 8.7934688 24.081266 8.9856406 24.210031 9.1816406 24.332031 C 9.5866406 24.584031 9.7357344 25.105875 9.5527344 25.546875 L 9.4863281 25.705078 C 9.2753281 26.215078 9.5173438 26.801672 10.027344 27.013672 C 10.537344 27.224672 11.121984 26.982656 11.333984 26.472656 L 11.398438 26.316406 C 11.580438 25.877406 12.049672 25.61275 12.513672 25.71875 C 12.737672 25.76975 12.964359 25.814562 13.193359 25.851562 C 13.662359 25.924562 14 26.350125 14 26.828125 L 14 27 C 14 27.552 14.448 28 15 28 C 15.552 28 16 27.552 16 27 L 16 26.828125 C 16 26.350125 16.336594 25.923656 16.808594 25.847656 C 17.037594 25.810656 17.264281 25.767797 17.488281 25.716797 C 17.952281 25.610797 18.421516 25.8735 18.603516 26.3125 L 18.669922 26.46875 C 18.880922 26.97875 19.465563 27.221766 19.976562 27.009766 C 20.486563 26.798766 20.729578 26.214125 20.517578 25.703125 L 20.451172 25.542969 C 20.268172 25.101969 20.415312 24.581125 20.820312 24.328125 C 21.016313 24.206125 21.208484 24.079312 21.396484 23.945312 C 21.784484 23.668312 22.321203 23.731359 22.658203 24.068359 L 22.779297 24.191406 C 23.170297 24.582406 23.803359 24.582406 24.193359 24.191406 C 24.583359 23.800406 24.584359 23.167344 24.193359 22.777344 L 24.072266 22.654297 C 23.735266 22.317297 23.670266 21.782531 23.947266 21.394531 C 24.081266 21.206531 24.210031 21.014359 24.332031 20.818359 C 24.584031 20.413359 25.105875 20.264266 25.546875 20.447266 L 25.705078 20.513672 C 26.215078 20.724672 26.801672 20.482656 27.013672 19.972656 C 27.224672 19.462656 26.982656 18.878016 26.472656 18.666016 L 26.316406 18.601562 C 25.877406 18.419563 25.61275 17.950328 25.71875 17.486328 C 25.76975 17.262328 25.814562 17.035641 25.851562 16.806641 C 25.924562 16.337641 26.350125 16 26.828125 16 L 27 16 C 27.552 16 28 15.552 28 15 C 28 14.448 27.552 14 27 14 L 26.828125 14 C 26.350125 14 25.923656 13.663406 25.847656 13.191406 C 25.810656 12.962406 25.767797 12.735719 25.716797 12.511719 C 25.610797 12.047719 25.8735 11.578484 26.3125 11.396484 L 26.46875 11.330078 C 26.97875 11.119078 27.221766 10.534437 27.009766 10.023438 C 26.798766 9.5134375 26.214125 9.2704219 25.703125 9.4824219 L 25.542969 9.5488281 C 25.101969 9.7318281 24.581125 9.5846875 24.328125 9.1796875 C 24.206125 8.9836875 24.079312 8.7915156 23.945312 8.6035156 C 23.668312 8.2155156 23.731359 7.6787969 24.068359 7.3417969 L 24.191406 7.2207031 C 24.582406 6.8297031 24.582406 6.1966406 24.191406 5.8066406 C 23.800406 5.4156406 23.167344 5.4156406 22.777344 5.8066406 L 22.65625 5.9296875 C 22.31925 6.2666875 21.782531 6.3316875 21.394531 6.0546875 C 21.206531 5.9206875 21.014359 5.7919219 20.818359 5.6699219 C 20.413359 5.4179219 20.266219 4.8960781 20.449219 4.4550781 L 20.515625 4.296875 C 20.726625 3.786875 20.484609 3.2002812 19.974609 2.9882812 C 19.464609 2.7772813 18.879969 3.0192969 18.667969 3.5292969 L 18.601562 3.6855469 C 18.419563 4.1245469 17.950328 4.3892031 17.486328 4.2832031 C 17.262328 4.2322031 17.035641 4.1873906 16.806641 4.1503906 C 16.336641 4.0753906 16 3.649875 16 3.171875 L 16 3 C 16 2.448 15.552 2 15 2 z M 15 7 C 19.078645 7 22.438586 10.054876 22.931641 14 L 16.722656 14 C 16.376387 13.404366 15.738946 13 15 13 L 11.896484 7.625 C 12.850999 7.222729 13.899211 7 15 7 z M 10.169922 8.6328125 L 13.273438 14.007812 C 13.104603 14.30117 13 14.63706 13 15 C 13 15.361994 13.103465 15.697397 13.271484 15.990234 L 10.167969 21.365234 C 8.2464258 19.903996 7 17.600071 7 15 C 7 12.398945 8.2471371 10.093961 10.169922 8.6328125 z M 16.722656 16 L 22.931641 16 C 22.438586 19.945124 19.078645 23 15 23 C 13.899211 23 12.850999 22.777271 11.896484 22.375 L 14.998047 17 C 14.998047 17 15 17 15 17 C 15.738946 17 16.376387 16.595634 16.722656 16 z" />
    </svg>
  );
}

function TileIcon({ type }) {
  const props = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" };

  if (type === "theme") {
    return (
      <svg {...props}>
        <path d="M4 16.5C7.8 16.5 7.8 7.5 12 7.5C16.2 7.5 16.2 16.5 20 16.5" />
        <path d="M8 19H16" />
        <path d="M12 5V3" />
      </svg>
    );
  }

  if (type === "help") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8" />
        <path d="M9.8 9.6C10.1 8.4 11 7.7 12.2 7.7C13.6 7.7 14.5 8.5 14.5 9.7C14.5 11.7 12 11.8 12 14" />
        <path d="M12 16.7H12.01" />
      </svg>
    );
  }

  if (type === "rules") {
    return (
      <svg {...props}>
        <path d="M12 3.8L18 6.3V11.3C18 15.1 15.6 18.4 12 20.2C8.4 18.4 6 15.1 6 11.3V6.3L12 3.8Z" />
        <path d="M9.5 12L11.2 13.7L15 9.5" />
      </svg>
    );
  }

  if (type === "bell") {
    return (
      <svg {...props}>
        <path d="M18 16.2H6C7.1 15 7.6 13.7 7.6 11.6V10.2C7.6 7.8 9.4 5.9 12 5.9C14.6 5.9 16.4 7.8 16.4 10.2V11.6C16.4 13.7 16.9 15 18 16.2Z" />
        <path d="M10.3 18.2C10.7 19.1 11.2 19.5 12 19.5C12.8 19.5 13.3 19.1 13.7 18.2" />
      </svg>
    );
  }

  if (type === "lock") {
    return (
      <svg {...props}>
        <rect x="6" y="10" width="12" height="9" rx="2.3" />
        <path d="M8.7 10V8.2C8.7 6.2 10.1 4.8 12 4.8C13.9 4.8 15.3 6.2 15.3 8.2V10" />
        <path d="M12 13.2V15.8" />
      </svg>
    );
  }

  if (type === "info") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 11.2V16" />
        <path d="M12 8H12.01" />
      </svg>
    );
  }

  if (type === "doc") {
    return (
      <svg {...props}>
        <rect x="6.2" y="4.2" width="11.6" height="15.6" rx="2.8" />
        <path d="M9 8H15" />
        <path d="M9 11.5H15" />
        <path d="M9 15H13" />
      </svg>
    );
  }

  return null;
}

function ThemeSegment({ theme, onToggleTheme }) {
  return (
    <div className="settings-theme-segment" aria-label="Выбор темы">
      <button
        type="button"
        className={theme === "light" ? "active" : ""}
        onClick={() => theme !== "light" && onToggleTheme?.()}
      >
        Светлая
      </button>
      <button
        type="button"
        className={theme === "dark" ? "active" : ""}
        onClick={() => theme !== "dark" && onToggleTheme?.()}
      >
        Тёмная
      </button>
    </div>
  );
}

function SettingsRow({ icon, accent = "cyan", title, subtitle, right, onClick }) {
  return (
    <button type="button" className={`settings-ios-row accent-${accent}`} onClick={onClick}>
      <span className="settings-ios-row-icon"><TileIcon type={icon} /></span>
      <span className="settings-ios-row-text">
        <span className="settings-ios-row-title">{title}</span>
        <span className="settings-ios-row-sub">{subtitle}</span>
      </span>
      {right || (
        <span className="settings-ios-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M9 5L16 12L9 19" /></svg>
        </span>
      )}
    </button>
  );
}





function NotificationIcon({ type }) {
  if (type === "chat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <rect x="3.5" y="5" width="17" height="13" rx="2.8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.8 6.6L12 12.1L19.2 6.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "moderation") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.6 12.2L10.8 14.4L15.7 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "promotion") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M14.2 4.2C12.8 4.7 11.3 5.7 10.15 6.85C8.3 8.7 7.33 10.92 7.12 13.2L4.65 15.67C4.3 16.02 4.3 16.58 4.65 16.93L7.07 19.35C7.42 19.7 7.98 19.7 8.33 19.35L10.8 16.88C13.08 16.67 15.3 15.7 17.15 13.85C18.3 12.7 19.3 11.2 19.8 9.8L20.34 8.26C20.61 7.47 20.41 6.59 19.82 6C19.23 5.41 18.35 5.21 17.56 5.48L16.02 6.02L14.2 4.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" />
        <path d="M5.7 18.3L8.4 15.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "favorites") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M12 20.6C10.25 19.13 8.78 17.82 7.59 16.68C6.39 15.53 5.43 14.45 4.7 13.43C3.97 12.4 3.6 11.34 3.6 10.23C3.6 8.82 4.07 7.62 5.01 6.65C5.96 5.68 7.13 5.2 8.54 5.2C9.36 5.2 10.16 5.38 10.94 5.73C11.72 6.09 12.4 6.59 13 7.24C13.6 6.59 14.28 6.09 15.06 5.73C15.84 5.38 16.64 5.2 17.46 5.2C18.87 5.2 20.04 5.68 20.99 6.65C21.93 7.62 22.4 8.82 22.4 10.23C22.4 11.34 22.03 12.4 21.3 13.43C20.57 14.45 19.61 15.53 18.41 16.68C17.22 17.82 15.75 19.13 14 20.6L13 21.4L12 20.6Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return null;
}


function NotificationLoading() {
  return (
    <div className="notification-loading-pretty" aria-busy="true" aria-label="Загрузка уведомлений">
      <div className="notification-loading-hero">
        <span className="notification-loading-pulse" />
        <div>
          <strong>Загружаем уведомления</strong>
          <small>Подготавливаем ваши настройки</small>
        </div>
      </div>

      <div className="notification-skeleton-list">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="notification-skeleton-card">
            <span className="notification-skeleton-icon shimmer" />
            <span className="notification-skeleton-lines">
              <span className="notification-skeleton-line shimmer" />
              <span className="notification-skeleton-line short shimmer" />
            </span>
            <span className="notification-skeleton-toggle shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationSwitch({ icon, title, subtitle, checked, disabled, onChange }) {
  return (
    <button
      type="button"
      className={`notification-switch-row ${checked ? "is-on" : "is-off"}`}
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange?.(!checked)}
    >
      <span className={`notification-row-icon notification-row-icon-${icon}`} aria-hidden="true"><NotificationIcon type={icon} /></span>
      <span className="notification-row-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className={`notification-switch ${checked ? "checked" : ""}`} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

const NOTIFICATION_CACHE_KEY = "baraholka_notification_settings_v1";

function readNotificationCache(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${NOTIFICATION_CACHE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeNotificationCache(userId, value) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${NOTIFICATION_CACHE_KEY}_${userId}`, JSON.stringify(value));
  } catch {
    // ignore cache errors
  }
}

function isVkNotificationUser(user) {
  return (
    user?.authProvider === "vk" ||
    Boolean(user?.vkId) ||
    String(user?.id || "").startsWith("vk_")
  );
}

function openNotificationLink(url) {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return;

  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(cleanUrl);
    return;
  }

  window.open(cleanUrl, "_blank", "noopener,noreferrer");
}

const DEFAULT_NOTIFICATION_SETTINGS = {
  chatMessages: true,
  moderation: true,
  promotion: true,
  favorites: false,
  botCanMessage: false,
  vkCommunityMessagesAllowed: false,
  vkNotificationsEnabled: false,
  vkNotificationStatus: "",
  vkCommunityId: "",
  vkCommunityWriteUrl: "",
};

function NotificationsPage({ user, onBack }) {
  const isVkUser = isVkNotificationUser(user);
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [vkStatus, setVkStatus] = useState(null);
  const [vkConnectRequested, setVkConnectRequested] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const syncVkStatus = (data) => {
    if (!data) return;

    const normalized = {
      configured: data.configured !== false,
      canCheck: data.canCheck !== false,
      isAllowed: Boolean(data.isAllowed),
      connectUrl: data.connectUrl || "",
      status: data.status || "",
      communityId: data.communityId || "",
      message: data.message || "",
    };

    setVkStatus(normalized);
    setSettings((current) => ({
      ...current,
      vkCommunityMessagesAllowed: normalized.isAllowed,
      vkNotificationsEnabled: normalized.isAllowed,
      vkNotificationStatus: normalized.status,
      vkCommunityId: normalized.communityId,
      vkCommunityWriteUrl: normalized.connectUrl || current.vkCommunityWriteUrl || "",
    }));
  };

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setStatus("");

    getNotificationSettings(user.id)
      .then(async (data) => {
        if (cancelled) return;
        setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...data });

        if (isVkUser) {
          try {
            const vkData = await getVkCommunityNotificationStatus();
            if (!cancelled) syncVkStatus(vkData);
          } catch (error) {
            if (!cancelled) {
              console.warn("Не удалось проверить VK-уведомления:", error);
              setVkStatus({ configured: false, canCheck: false, isAllowed: false, status: "error" });
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("Не удалось загрузить настройки уведомлений");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, isVkUser]);

  const savePatch = async (patch) => {
    if (!user?.id) {
      setStatus("Войдите в аккаунт, чтобы управлять уведомлениями");
      return;
    }

    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setStatus("Сохраняем...");

    try {
      await updateNotificationSettings(user.id, patch);
      writeNotificationCache(user.id, next);
      setStatus("Настройки сохранены");
    } catch (error) {
      console.error("Ошибка настроек уведомлений:", error);
      setSettings(previous);
      setStatus(error.message || "Не удалось сохранить настройки");
    }
  };

  const handleTelegramRequestAccess = async () => {
    if (!user?.id) {
      setStatus("Войдите через Telegram, чтобы включить уведомления");
      return;
    }

    setStatus("Запрашиваем разрешение Telegram...");

    try {
      const allowed = await requestBotWriteAccess();
      await savePatch({ botCanMessage: allowed });
      setStatus(
        allowed
          ? "Разрешение получено. Бот сможет присылать уведомления."
          : "Telegram не дал разрешение. Можно попробовать ещё раз позже."
      );
    } catch (error) {
      console.error("requestWriteAccess error:", error);
      setStatus(error.message || "Не удалось запросить разрешение Telegram");
    }
  };

  const handleVkRequestAccess = async () => {
    setStatus("Готовим подключение уведомлений ВКонтакте...");

    try {
      const data = await connectVkCommunityNotifications();
      syncVkStatus(data);

      if (data?.isAllowed) {
        setStatus("Уведомления ВКонтакте подключены");
        return;
      }

      if (data?.connectUrl) {
        openNotificationLink(data.connectUrl);
        setVkConnectRequested(true);
        setStatus("Разрешите сообщения в диалоге с сообществом ВК, затем вернитесь и нажмите “Проверить разрешение”.");
        return;
      }

      setStatus(data?.message || "Не удалось открыть диалог с сообществом ВК");
    } catch (error) {
      console.error("Ошибка подключения VK-уведомлений:", error);
      setStatus(error.message || "Не удалось начать подключение VK-уведомлений");
    }
  };

  const handleVkCheckAccess = async () => {
    setStatus("Проверяем разрешение сообщений ВК...");

    try {
      const data = await checkVkCommunityNotifications();
      syncVkStatus(data);

      if (data?.isAllowed) {
        setStatus("Уведомления ВКонтакте подключены");
        setVkConnectRequested(false);
        return;
      }

      setVkConnectRequested(true);
      setStatus(data?.message || "Сообщество пока не может отправлять вам сообщения. Откройте диалог ВК и разрешите сообщения.");
    } catch (error) {
      console.error("Ошибка проверки VK-уведомлений:", error);
      setStatus(error.message || "Не удалось проверить разрешение сообщений ВК");
    }
  };

  const vkAllowed = Boolean(vkStatus?.isAllowed || settings.vkCommunityMessagesAllowed || settings.vkNotificationsEnabled);
  const vkConfigured = vkStatus ? vkStatus.configured !== false : true;
  const vkCanCheck = vkStatus ? vkStatus.canCheck !== false : true;
  const shouldShowTelegramAccess = !isVkUser && !(settings.botCanMessage || user?.botCanMessage);
  const shouldShowVkAccess = isVkUser && !vkAllowed;
  const vkButtonText = !vkConfigured
    ? "VK-сообщество не настроено"
    : !vkCanCheck
    ? "VK-токен не настроен"
    : vkConnectRequested || settings.vkNotificationStatus === "open_dialog_required"
    ? "Проверить разрешение сообщений ВК"
    : "Разрешить сообщения во ВКонтакте";

  const description = isVkUser
    ? "Настройте уведомления так, как удобно вам. Общение происходит внутри Барахолки, а важные уведомления могут приходить в диалог с сообществом ВКонтакте."
    : "Настройте уведомления так, как удобно вам. Общение происходит прямо внутри приложения, а важные уведомления могут приходить в Telegram.";

  return (
    <div className="settings-detail-page page-enter">
      <PageBackButton onClick={onBack} />
      <section className="settings-about-card notifications-card">
        <div className="settings-soon-icon"><TileIcon type="bell" /></div>
        <h2>Уведомления</h2>
        <p>{description}</p>

        {loading ? (
          <NotificationLoading />
        ) : (
          <div className="notification-list">
            <NotificationSwitch
              icon="chat"
              title="Сообщения по объявлениям"
              subtitle="Уведомлять о новых сообщениях в чатах"
              checked={settings.chatMessages}
              onChange={(value) => savePatch({ chatMessages: value })}
            />
            <NotificationSwitch
              icon="moderation"
              title="Модерация объявлений"
              subtitle="Одобрено или отклонено"
              checked={settings.moderation}
              onChange={(value) => savePatch({ moderation: value })}
            />
            <NotificationSwitch
              icon="promotion"
              title="Продвижение"
              subtitle="Окончание VIP, Турбо или закрепа"
              checked={settings.promotion}
              onChange={(value) => savePatch({ promotion: value })}
            />
            <NotificationSwitch
              icon="favorites"
              title="Избранное"
              subtitle="Позже: изменение цены или снятие объявления"
              checked={settings.favorites}
              onChange={(value) => savePatch({ favorites: value })}
            />
          </div>
        )}

        {shouldShowTelegramAccess && (
          <button type="button" className="notification-access-btn" onClick={handleTelegramRequestAccess}>
            Разрешить уведомления от бота
          </button>
        )}

        {shouldShowVkAccess && (
          <button
            type="button"
            className="notification-access-btn"
            onClick={vkConnectRequested || settings.vkNotificationStatus === "open_dialog_required" ? handleVkCheckAccess : handleVkRequestAccess}
            disabled={!vkConfigured || !vkCanCheck}
          >
            {vkButtonText}
          </button>
        )}

        {isVkUser && vkAllowed && !status && (
          <div className="notification-status">Уведомления ВКонтакте подключены</div>
        )}

        {status && <div className="notification-status">{status}</div>}
      </section>
    </div>
  );
}

function ComingSoonPage({ type, onBack }) {
  const title = type === "security" ? "Безопасность" : "Уведомления";
  const text =
    type === "security"
      ? "Раздел безопасности появится в одном из следующих обновлений. Здесь будут настройки приватности, доступа и защиты профиля."
      : "Раздел уведомлений появится скоро. Здесь будут настройки сообщений, важных событий и обновлений по объявлениям.";

  return (
    <div className="settings-detail-page page-enter">
      <PageBackButton onClick={onBack} />
      <section className="settings-soon-card">
        <div className="settings-soon-icon"><TileIcon type={type === "security" ? "lock" : "bell"} /></div>
        <h2>{title}</h2>
        <p>{text}</p>
        <span>Будет скоро — следите за обновлениями в канале</span>
        <button type="button" onClick={openChannel}>Открыть @baraholka_channel</button>
      </section>
    </div>
  );
}

function AboutPage({ onBack }) {
  return (
    <div className="settings-detail-page page-enter">
      <PageBackButton onClick={onBack} />
      <section className="settings-about-card">
        <div className="settings-soon-icon"><TileIcon type="info" /></div>
        <h2>О приложении</h2>
        <p className="settings-about-version">Версия 1.0.3</p>
        <div className="settings-update-list">
          <div><strong>Новый главный экран</strong><span>Обновили карточки, категории и визуальный стиль.</span></div>
          <div><strong>Проверенные продавцы</strong><span>Добавили быстрый фильтр по подтверждённым профилям.</span></div>
          <div><strong>Продвижение объявлений</strong><span>Подготовлена основа для VIP, закрепа и турбо-поднятия.</span></div>
          <div><strong>Настройки</strong><span>Перенесли управление темой и важные разделы в отдельную панель.</span></div>
        </div>
        <span className="settings-channel-caption">За новыми обновлениями следите в канале</span>
        <button type="button" onClick={openChannel}>Открыть @baraholka_channel</button>
      </section>
    </div>
  );
}

export default function SettingsPage({ user, onOpenHelp, onOpenLegal, onBack, theme, onToggleTheme }) {
  const [innerPage, setInnerPage] = useState(null);

  if (innerPage === "notifications") {
    return <NotificationsPage user={user} onBack={() => setInnerPage(null)} />;
  }

  if (innerPage === "security") {
    return <ComingSoonPage type={innerPage} onBack={() => setInnerPage(null)} />;
  }

  if (innerPage === "about") {
    return <AboutPage onBack={() => setInnerPage(null)} />;
  }

  return (
    <div className="settings-ios-page page-enter">
      <section className="settings-ios-hero">
        <div className="settings-ios-hero-icon"><GearIcon /></div>
        <div>
          <h1>Настройки</h1>
          <p>Управляйте приложением</p>
        </div>
      </section>

      <section className="settings-ios-list">
        <SettingsRow
          icon="theme"
          accent="cyan"
          title="Тема"
          subtitle="Светлая / Тёмная"
          right={<ThemeSegment theme={theme} onToggleTheme={onToggleTheme} />}
          onClick={() => {}}
        />
        <SettingsRow icon="help" accent="gold" title="Помощь" subtitle="Ответы на частые вопросы" onClick={onOpenHelp} />
        <SettingsRow icon="rules" accent="cyan" title="Правила" subtitle="Правила платформы и публикаций" onClick={() => onOpenLegal("terms")} />
      </section>

      <div className="settings-ios-section-title">Важные разделы</div>

      <section className="settings-ios-list">
        <SettingsRow icon="bell" accent="cyan" title="Уведомления" subtitle="Настройка уведомлений" onClick={() => setInnerPage("notifications")} />
        <SettingsRow icon="lock" accent="gold" title="Безопасность" subtitle="Конфиденциальность и доступ" onClick={() => setInnerPage("security")} />
        <SettingsRow icon="info" accent="cyan" title="О приложении" subtitle="Версия 1.0.3" onClick={() => setInnerPage("about")} />
      </section>

      <section className="settings-ios-list settings-ios-doc-list">
        <SettingsRow icon="doc" accent="gold" title="Пользовательское соглашение" subtitle="Открыть документ" onClick={() => onOpenLegal("agreement")} />
        <SettingsRow icon="doc" accent="cyan" title="Политика конфиденциальности" subtitle="Открыть документ" onClick={() => onOpenLegal("privacy")} />
      </section>
    </div>
  );
}
