import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeTelegramOidcLogin,
  completeVkIdLogin,
  consumeOidcReturnPage,
} from "../auth";

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

export default function AuthCallbackPage({ onDone, onBack, provider = "telegram" }) {
  const isVk = provider === "vk";
  const [status, setStatus] = useState(isVk ? "Завершаем вход через VK..." : "Завершаем вход через Telegram...");
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  const labels = useMemo(() => ({
    providerName: isVk ? "VK ID" : "Telegram OpenID Connect",
    checking: isVk ? "Проверяем VK ID..." : "Проверяем Telegram OpenID Connect...",
    failedTitle: "Вход не завершён",
    successTitle: "Подключаем профиль",
    errorText: isVk
      ? "Попробуйте авторизоваться ещё раз. Если ошибка повторяется, проверьте VK ID Redirect URI и переменные VK_ID_CLIENT_ID на Render."
      : "Попробуйте авторизоваться ещё раз. Если ошибка повторяется, проверьте настройки Redirect URI и Trusted Origin в BotFather.",
    pendingText: isVk
      ? "Проверяем VK ID и создаём защищённую сессию для сайта."
      : "Проверяем подпись Telegram и создаём защищённую сессию для сайта.",
  }), [isVk]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const finish = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const deviceId = params.get("device_id");
        const providerError = params.get("error");
        const providerErrorDescription = params.get("error_description");

        if (providerError) {
          throw new Error(providerErrorDescription || providerError || "Авторизация отменена");
        }

        setStatus(labels.checking);
        const result = isVk
          ? await completeVkIdLogin({ code, state, deviceId })
          : await completeTelegramOidcLogin({ code, state });

        const returnPage = consumeOidcReturnPage();

        window.history.replaceState({}, "", "/");
        setStatus("Готово. Открываем приложение...");

        window.setTimeout(() => {
          onDone?.(result.user, result.profile, returnPage);
        }, 350);
      } catch (err) {
        console.error(`${labels.providerName} callback error:`, err);
        setError(err.message || `Не удалось завершить вход через ${labels.providerName}`);
        setStatus("");
      }
    };

    finish();
  }, [isVk, labels, onDone]);

  return (
    <div className="login-page auth-callback-page page-enter">
      <section className="login-card">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />

        <div className={`login-icon ${isVk ? "login-icon-vk" : ""}`}>
          {isVk ? <VkIcon /> : <TelegramIcon />}
        </div>

        <div className="login-kicker">{labels.providerName}</div>
        <h1>{error ? labels.failedTitle : labels.successTitle}</h1>
        <p>{error ? labels.errorText : labels.pendingText}</p>

        {status && <div className="login-status">{status}</div>}
        {error && <div className="login-status login-status-error">{error}</div>}

        {error && (
          <div className="login-actions">
            <button type="button" className="login-secondary-btn" onClick={onBack}>
              Вернуться в приложение
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
