import { useEffect, useState } from "react";
import {
  BOT_USERNAME,
  startTelegramOidcLogin,
  startVkIdLogin,
} from "../auth";
import { isVkMiniAppLaunch } from "../vkMiniApp";

const CHANNEL_URL = "https://t.me/baraholka_channel";

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 4.8L17.7 19.2C17.5 20.1 16.8 20.3 16.1 19.9L11.8 16.8L9.7 18.8C9.5 19 9.3 19.2 8.8 19.2L9.1 14.8L17.1 7.6C17.5 7.3 17 7.1 16.6 7.4L6.7 13.6L2.5 12.3C1.6 12 1.6 11.4 2.7 11L19.2 4.6C20 4.3 20.7 4.8 20.5 4.8Z" />
    </svg>
  );
}

function VkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13.08 17.2C6.92 17.2 3.4 12.98 3.25 5.95H6.34C6.44 11.11 8.71 13.29 10.5 13.74V5.95H13.41V10.4C15.17 10.21 17.02 8.18 17.64 5.95H20.55C20.08 8.7 18.08 10.73 16.66 11.57C18.08 12.25 20.36 14.02 21.22 17.2H18.02C17.34 15.06 15.65 13.4 13.41 13.17V17.2H13.08Z" />
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

export default function LoginPage({ returnPage = "profile" }) {
  const isVkMiniApp = isVkMiniAppLaunch();
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleTelegramLogin = async () => {
    try {
      setIsLoading(true);
      setLoadingProvider("telegram");
      setStatus("Открываем Telegram OpenID Connect...");
      await startTelegramOidcLogin(returnPage);
    } catch (error) {
      console.error("Telegram OIDC login start error:", error);
      setIsLoading(false);
      setLoadingProvider("");
      setStatus(error.message || "Не удалось открыть вход через Telegram");
    }
  };

  const handleVkLogin = async () => {
    try {
      setIsLoading(true);
      setLoadingProvider("vk");

      setStatus("Открываем VK ID...");
      await startVkIdLogin(returnPage);
    } catch (error) {
      console.error("VK login error:", error);
      setIsLoading(false);
      setLoadingProvider("");
      setStatus(error.message || "Не удалось войти через VK");
    }
  };

  return (
    <div className="login-page page-enter">
      <section className="login-card">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />

        <div className={isVkMiniApp ? "login-icon login-icon-vk" : "login-icon"}>
          {isVkMiniApp ? <VkIcon /> : <TelegramIcon />}
        </div>

        <div className="login-kicker">{isVkMiniApp ? "VK Mini Apps" : "Единый аккаунт"}</div>
        <h1>Вход в Барахолку</h1>
        <p>
          {isVkMiniApp
            ? "Внутри ВКонтакте вход выполняется автоматически только по launch-параметрам VK Mini Apps. Если профиль не загрузился, откройте сервис заново из ВКонтакте."
            : "На сайте можно войти через Telegram или VK. После входа профиль, объявления, избранное и чаты будут работать внутри Барахолки."}
        </p>

        {isVkMiniApp ? (
          <>
            <button
              type="button"
              className="vk-id-login-btn"
              onClick={() => window.location.reload()}
            >
              <VkIcon />
              <span>Повторить проверку</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="telegram-oidc-login-btn"
              onClick={handleTelegramLogin}
              disabled={isLoading}
            >
              <TelegramIcon />
              <span>{loadingProvider === "telegram" ? "Открываем Telegram..." : "Войти через Telegram"}</span>
            </button>

            <button
              type="button"
              className="vk-id-login-btn"
              onClick={handleVkLogin}
              disabled={isLoading}
            >
              <VkIcon />
              <span>{loadingProvider === "vk" ? "Открываем VK..." : "Войти через VK"}</span>
            </button>
          </>
        )}

        {status && <div className="login-status">{status}</div>}

        <div className="login-note">
          {isVkMiniApp
            ? "Внешние способы входа внутри VK Mini App отключены. Авторизация доступна только при запуске приложения из ВКонтакте с корректными параметрами VK."
            : "В Mini App внутри Telegram авторизация по-прежнему происходит автоматически. В браузере можно выбрать удобный способ входа."}
        </div>

        {!isVkMiniApp && (
          <div className="login-actions">
            <button type="button" className="login-secondary-btn" onClick={openTelegramBot}>
              Открыть бота
            </button>
            <button type="button" className="login-ghost-btn" onClick={openChannel}>
              Канал проекта
            </button>
          </div>
        )}
      </section>

    </div>
  );
}
