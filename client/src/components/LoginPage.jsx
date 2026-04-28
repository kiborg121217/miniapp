import { useEffect, useState } from "react";
import { BOT_USERNAME, startTelegramOidcLogin } from "../auth";

const CHANNEL_URL = "https://t.me/baraholka_channel";

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 4.8L17.7 19.2C17.5 20.1 16.8 20.3 16.1 19.9L11.8 16.8L9.7 18.8C9.5 19 9.3 19.2 8.8 19.2L9.1 14.8L17.1 7.6C17.5 7.3 17 7.1 16.6 7.4L6.7 13.6L2.5 12.3C1.6 12 1.6 11.4 2.7 11L19.2 4.6C20 4.3 20.7 4.8 20.5 4.8Z" />
    </svg>
  );
}

function openTelegramBot() {
  const tg = window.Telegram?.WebApp;
  const url = `https://t.me/${BOT_USERNAME}`;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function openChannel() {
  const tg = window.Telegram?.WebApp;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(CHANNEL_URL);
    return;
  }

  window.open(CHANNEL_URL, "_blank", "noopener,noreferrer");
}

export default function LoginPage({ onBack, returnPage = "profile" }) {
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setStatus("Открываем Telegram OpenID Connect...");
      await startTelegramOidcLogin(returnPage);
    } catch (error) {
      console.error("Telegram OIDC login start error:", error);
      setIsLoading(false);
      setStatus(error.message || "Не удалось открыть вход через Telegram");
    }
  };

  return (
    <div className="login-page page-enter">
      <section className="login-card">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />

        <div className="login-icon">
          <TelegramIcon />
        </div>

        <div className="login-kicker">Единый аккаунт</div>
        <h1>Вход через Telegram</h1>
        <p>
          Войдите через Telegram, чтобы профиль, избранное, объявления и будущие
          чаты работали одинаково в Mini App и на сайте.
        </p>

        <button
          type="button"
          className="telegram-oidc-login-btn"
          onClick={handleLogin}
          disabled={isLoading}
        >
          <TelegramIcon />
          <span>{isLoading ? "Открываем Telegram..." : "Войти через Telegram"}</span>
        </button>

        {status && <div className="login-status">{status}</div>}

        <div className="login-note">
          Вход на сайте работает через новый Telegram OpenID Connect. В Mini App
          внутри Telegram авторизация по-прежнему происходит автоматически.
        </div>

        <div className="login-actions">
          <button type="button" className="login-secondary-btn" onClick={openTelegramBot}>
            Открыть бота
          </button>
          <button type="button" className="login-ghost-btn" onClick={openChannel}>
            Канал проекта
          </button>
        </div>
      </section>

    </div>
  );
}
