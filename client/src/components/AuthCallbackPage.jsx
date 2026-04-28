import { useEffect, useRef, useState } from "react";
import {
  completeTelegramOidcLogin,
  consumeOidcReturnPage,
} from "../auth";

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 4.8L17.7 19.2C17.5 20.1 16.8 20.3 16.1 19.9L11.8 16.8L9.7 18.8C9.5 19 9.3 19.2 8.8 19.2L9.1 14.8L17.1 7.6C17.5 7.3 17 7.1 16.6 7.4L6.7 13.6L2.5 12.3C1.6 12 1.6 11.4 2.7 11L19.2 4.6C20 4.3 20.7 4.8 20.5 4.8Z" />
    </svg>
  );
}

export default function AuthCallbackPage({ onDone, onBack }) {
  const [status, setStatus] = useState("Завершаем вход через Telegram...");
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const finish = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const tgError = params.get("error");
        const tgErrorDescription = params.get("error_description");

        if (tgError) {
          throw new Error(tgErrorDescription || tgError || "Telegram отменил вход");
        }

        setStatus("Проверяем Telegram OpenID Connect...");
        const result = await completeTelegramOidcLogin({ code, state });
        const returnPage = consumeOidcReturnPage();

        window.history.replaceState({}, "", "/");
        setStatus("Готово. Открываем приложение...");

        window.setTimeout(() => {
          onDone?.(result.user, result.profile, returnPage);
        }, 350);
      } catch (err) {
        console.error("Telegram OIDC callback error:", err);
        setError(err.message || "Не удалось завершить вход через Telegram");
        setStatus("");
      }
    };

    finish();
  }, [onDone]);

  return (
    <div className="login-page auth-callback-page page-enter">
      <section className="login-card">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />

        <div className="login-icon">
          <TelegramIcon />
        </div>

        <div className="login-kicker">Telegram OpenID Connect</div>
        <h1>{error ? "Вход не завершён" : "Подключаем профиль"}</h1>
        <p>
          {error
            ? "Попробуйте авторизоваться ещё раз. Если ошибка повторяется, проверьте настройки Redirect URI и Trusted Origin в BotFather."
            : "Проверяем подпись Telegram и создаём защищённую сессию для сайта."}
        </p>

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
