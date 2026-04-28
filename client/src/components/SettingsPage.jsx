import { useEffect, useState } from "react";
import PageBackButton from "./PageBackButton";
import { getNotificationSettings, updateNotificationSettings } from "../firebase";
import { requestBotWriteAccess } from "../telegram";

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
      <svg viewBox="0 0 128 128" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M116.73,31.83a3,3,0,0,0-4.2-.61L64.14,67.34a1,1,0,0,1-1.2,0L15.5,31.06a3,3,0,1,0-3.64,4.77L49.16,64.36,12.27,92.16A3,3,0,1,0,15.88,97L54.11,68.14l5.18,4a7,7,0,0,0,8.43.06l5.44-4.06L111.84,97a3,3,0,1,0,3.59-4.81L78.17,64.35,116.12,36A3,3,0,0,0,116.73,31.83Z" />
        <path fill="currentColor" d="M113,19H15A15,15,0,0,0,0,34V94a15,15,0,0,0,15,15h98a15,15,0,0,0,15-15V34A15,15,0,0,0,113,19Zm9,75a9,9,0,0,1-9,9H15a9,9,0,0,1-9-9V34a9,9,0,0,1,9-9h98a9,9,0,0,1,9,9Z" />
      </svg>
    );
  }

  if (type === "moderation") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M16.2802 9.78034C16.5731 9.48746 16.5731 9.01258 16.2802 8.71968C15.9873 8.42678 15.5125 8.42677 15.2196 8.71966L10.7499 13.1891L9.27642 11.7157C8.98353 11.4228 8.50865 11.4228 8.21576 11.7157C7.92287 12.0085 7.92287 12.4834 8.21576 12.7763L10.2196 14.7801C10.5124 15.073 10.9873 15.073 11.2802 14.7801L16.2802 9.78034ZM6.25 3C4.45507 3 3 4.45507 3 6.25V17.75C3 19.5449 4.45507 21 6.25 21H17.75C19.5449 21 21 19.5449 21 17.75V6.25C21 4.45507 19.5449 3 17.75 3H6.25ZM4.5 6.25C4.5 5.2835 5.2835 4.5 6.25 4.5H17.75C18.7165 4.5 19.5 5.2835 19.5 6.25V17.75C19.5 18.7165 18.7165 19.5 17.75 19.5H6.25C5.2835 19.5 4.5 18.7165 4.5 17.75V6.25Z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "promotion") {
    return (
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M118.75,157a4.87,4.87,0,0,1-.66,0,5,5,0,0,1-3.67-2.46l-11.73-20.32L91,132.41A27.58,27.58,0,0,1,67.59,109l-1.73-11.7L45.54,85.58a5,5,0,0,1-2.46-3.67,5,5,0,0,1,1.42-4.19L62.18,60a5,5,0,0,1,3.53-1.46H99l24.76-24.77a32.31,32.31,0,0,1,26-9.35l19.46,1.83a5,5,0,0,1,4.51,4.51l1.83,19.46a32.3,32.3,0,0,1-9.35,26L141.42,101v33.29a5,5,0,0,1-1.46,3.53L122.28,155.5A5,5,0,0,1,118.75,157ZM56.18,80.18,73,89.86a5,5,0,0,1,2.45,3.6l2.08,14.09a17.65,17.65,0,0,0,15,15l14.09,2.08a5,5,0,0,1,3.6,2.45l9.68,16.77,11.6-11.61V98.93a5,5,0,0,1,1.47-3.53l26.23-26.23a22.39,22.39,0,0,0,6.47-18l-1.45-15.34L148.8,34.41a22.41,22.41,0,0,0-18,6.47L104.6,67.11a5,5,0,0,1-3.53,1.47H67.79Z" />
        <path fill="currentColor" d="M29.31,175.69a5,5,0,0,1-3.53-8.54l35.33-35.33a5,5,0,1,1,7.07,7.07L32.85,174.22A5,5,0,0,1,29.31,175.69Z" />
        <path fill="currentColor" d="M28.91,135.13a5,5,0,0,1-3.54-8.53l21.09-21.1a5,5,0,1,1,7.08,7.07l-21.1,21.1A5,5,0,0,1,28.91,135.13Z" />
        <path fill="currentColor" d="M69.46,175.69a5,5,0,0,1-3.53-8.54L87,146.06a5,5,0,1,1,7.07,7.07L73,174.22A5,5,0,0,1,69.46,175.69Z" />
        <path fill="currentColor" d="M141,73a14,14,0,1,1,14-14A14,14,0,0,1,141,73Zm0-18a4,4,0,1,0,4,4A4,4,0,0,0,141,55Z" />
      </svg>
    );
  }

  if (type === "favorites") {
    return (
      <svg viewBox="0 0 491.115 491.115" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M475.624,177.416l-154.417-13.033l-60.067-142.8c-2.55-6.233-8.783-10.483-15.583-10.483s-13.033,3.967-15.583,10.483l-60.067,142.8L15.491,177.416c-6.8,0.567-12.75,5.1-14.733,11.617s0,13.6,5.1,18.133l117.017,101.15L87.741,459.049c-1.417,6.8,1.133,13.6,6.517,17.567c5.667,3.967,13.033,4.25,18.7,0.85l132.6-80.183l132.6,80.183c2.833,1.7,5.667,2.55,8.783,2.55c3.4,0,7.083-1.133,9.917-3.117c5.667-3.967,8.217-11.05,6.517-17.567l-35.133-150.733l117.017-101.15c5.1-4.533,7.083-11.617,5.1-18.133C488.374,182.516,482.424,177.983,475.624,177.416z M338.208,289.616c-4.817,4.25-6.8,10.483-5.383,16.717l28.333,121.55l-106.817-64.6c-2.833-1.7-5.667-2.55-8.783-2.55c-3.117,0-6.233,0.85-8.783,2.55l-106.817,64.6l28.333-121.55c1.417-6.233-0.567-12.467-5.383-16.717l-94.35-81.6l124.383-10.483c6.233-0.567,11.9-4.533,14.167-10.2l48.45-115.317l48.45,115.033c2.55,5.95,7.933,9.917,14.167,10.2l124.383,10.483L338.208,289.616z" />
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
          <small>Подтягиваем ваши настройки из Firestore</small>
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

function NotificationsPage({ user, onBack }) {
  const [settings, setSettings] = useState({
    chatMessages: true,
    moderation: true,
    promotion: true,
    favorites: false,
    botCanMessage: false,
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setLoading(false);
      return undefined;
    }

    getNotificationSettings(user.id)
      .then((data) => {
        if (!cancelled) setSettings(data);
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
  }, [user?.id]);

  const savePatch = async (patch) => {
    if (!user?.id) {
      setStatus("Войдите через Telegram, чтобы управлять уведомлениями");
      return;
    }

    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setStatus("Сохраняем...");

    try {
      await updateNotificationSettings(user.id, patch);
      setStatus("Настройки сохранены");
    } catch (error) {
      console.error("Ошибка настроек уведомлений:", error);
      setSettings(previous);
      setStatus(error.message || "Не удалось сохранить настройки");
    }
  };

  const handleRequestAccess = async () => {
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

  return (
    <div className="settings-detail-page page-enter">
      <PageBackButton onClick={onBack} />
      <section className="settings-about-card notifications-card">
        <div className="settings-soon-icon"><TileIcon type="bell" /></div>
        <h2>Уведомления</h2>
        <p>
          Управляйте сообщениями от бота. Чаты работают через Firestore, а Telegram нужен только для пуш-уведомлений.
        </p>

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
              icon="★"
              title="Избранное"
              subtitle="Позже: изменение цены или снятие объявления"
              checked={settings.favorites}
              onChange={(value) => savePatch({ favorites: value })}
            />
          </div>
        )}

        <button type="button" className="notification-access-btn" onClick={handleRequestAccess}>
          {settings.botCanMessage ? "Разрешение Telegram получено" : "Разрешить уведомления от бота"}
        </button>

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
