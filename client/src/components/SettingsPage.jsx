import PageBackButton from "./PageBackButton";

function SettingsIcon({ type }) {
  if (type === "help") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" />
        <path d="M9.9 9.7C10.15 8.35 11.1 7.55 12.45 7.55C13.9 7.55 14.9 8.45 14.9 9.75C14.9 11.85 12.15 11.7 12.15 13.7" />
        <path d="M12.15 16.25H12.17" />
      </svg>
    );
  }

  if (type === "agreement") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 3.8H14.2L18 7.6V20.2H7V3.8Z" />
        <path d="M14 4V8H18" />
        <path d="M9.5 11H15.5" />
        <path d="M9.5 14H15.5" />
        <path d="M9.5 17H13.4" />
      </svg>
    );
  }

  if (type === "privacy") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3.6L18.4 6.1V11.2C18.4 15.35 15.75 18.95 12 20.4C8.25 18.95 5.6 15.35 5.6 11.2V6.1L12 3.6Z" />
        <path d="M9.2 12.2L11.2 14.2L15 10" />
      </svg>
    );
  }

  if (type === "terms") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6.2 5.6H17.8V18.4H6.2V5.6Z" />
        <path d="M9 9H15" />
        <path d="M9 12H15" />
        <path d="M9 15H13" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 8.4A3.6 3.6 0 1 0 12 15.6A3.6 3.6 0 0 0 12 8.4Z" />
      <path d="M19.2 12.65C19.24 12.44 19.25 12.22 19.25 12C19.25 11.78 19.24 11.56 19.2 11.35L21 9.95L19.25 6.95L17.1 7.82C16.75 7.55 16.38 7.34 15.95 7.16L15.62 4.85H12.38L12.05 7.16C11.62 7.34 11.25 7.55 10.9 7.82L8.75 6.95L7 9.95L8.8 11.35C8.76 11.56 8.75 11.78 8.75 12C8.75 12.22 8.76 12.44 8.8 12.65L7 14.05L8.75 17.05L10.9 16.18C11.25 16.45 11.62 16.66 12.05 16.84L12.38 19.15H15.62L15.95 16.84C16.38 16.66 16.75 16.45 17.1 16.18L19.25 17.05L21 14.05L19.2 12.65Z" />
    </svg>
  );
}

function SettingsRow({ icon, title, subtitle, tone = "cyan", onClick }) {
  return (
    <button className="premium-settings-row" onClick={onClick} type="button">
      <span className={`premium-settings-row-icon ${tone}`} aria-hidden="true">
        <SettingsIcon type={icon} />
      </span>

      <span className="premium-settings-row-text">
        <span className="premium-settings-row-title">{title}</span>
        <span className="premium-settings-row-subtitle">{subtitle}</span>
      </span>

      <span className="premium-settings-chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9.5 5.5L15 12L9.5 18.5" />
        </svg>
      </span>
    </button>
  );
}

export default function SettingsPage({
  onOpenHelp,
  onOpenLegal,
  onBack,
}) {
  return (
    <div className="settings-page-premium page-enter with-bottom-safe">
      <PageBackButton onClick={onBack} />

      <section className="premium-settings-hero">
        <div className="premium-settings-main-icon" aria-hidden="true">
          <SettingsIcon type="settings" />
        </div>

        <div className="premium-settings-heading">
          <div className="premium-settings-kicker">Настройки</div>
          <h1>Настройки приложения</h1>
          <p>Помощь, документы сервиса и важная информация всегда под рукой.</p>
        </div>
      </section>

      <section className="premium-settings-section">
        <div className="premium-settings-section-title">Основное</div>

        <SettingsRow
          icon="help"
          title="Помощь"
          subtitle="Как пользоваться приложением"
          tone="gold"
          onClick={onOpenHelp}
        />
      </section>

      <section className="premium-settings-section">
        <div className="premium-settings-section-title">Документы сервиса</div>

        <SettingsRow
          icon="agreement"
          title="Пользовательское соглашение"
          subtitle="Права, обязанности и правила сервиса"
          tone="cyan"
          onClick={() => onOpenLegal("agreement")}
        />

        <SettingsRow
          icon="privacy"
          title="Политика конфиденциальности"
          subtitle="Данные, профиль, Telegram Mini App"
          tone="mint"
          onClick={() => onOpenLegal("privacy")}
        />

        <SettingsRow
          icon="terms"
          title="Условия использования"
          subtitle="Модерация, доступность и функционал"
          tone="gold"
          onClick={() => onOpenLegal("terms")}
        />
      </section>

      <div className="premium-settings-footer">
        <span>Барахолка — MiniApp</span>
        <span>Версия приложения 1.0.0</span>
      </div>
    </div>
  );
}
