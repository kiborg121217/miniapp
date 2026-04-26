import PageBackButton from "./PageBackButton";

function SettingsIcon() {
  return (
    <span className="settings-icon-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 7.2H19" />
        <path d="M5 12H19" />
        <path d="M5 16.8H19" />
        <circle cx="9" cy="7.2" r="2" />
        <circle cx="15" cy="12" r="2" />
        <circle cx="10.5" cy="16.8" r="2" />
      </svg>
    </span>
  );
}

function TileIcon({ type }) {
  if (type === "help") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" />
        <path d="M9.8 9.6C10.1 8.4 11 7.7 12.2 7.7C13.6 7.7 14.5 8.5 14.5 9.7C14.5 11.7 12 11.8 12 14" />
        <path d="M12 16.7H12.01" />
      </svg>
    );
  }

  if (type === "privacy") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3.8L18 6.3V11.3C18 15.1 15.6 18.4 12 20.2C8.4 18.4 6 15.1 6 11.3V6.3L12 3.8Z" />
        <path d="M9.4 12.1L11.2 13.9L15 9.7" />
      </svg>
    );
  }

  if (type === "terms") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="6.2" y="4.2" width="11.6" height="15.6" rx="2.8" />
        <path d="M9 8H15" />
        <path d="M9 11.5H15" />
        <path d="M9 15H13" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <path d="M8.5 8H15.5" />
      <path d="M8.5 12H15.5" />
      <path d="M8.5 16H13" />
    </svg>
  );
}

export default function SettingsPage({ onOpenHelp, onOpenLegal, onBack }) {
  const items = [
    {
      type: "help",
      title: "Помощь",
      subtitle: "Как пользоваться приложением, объявлениями и профилем",
      action: onOpenHelp,
      accent: "cyan",
    },
    {
      type: "agreement",
      title: "Пользовательское соглашение",
      subtitle: "Правила сервиса, публикации объявлений и ответственность",
      action: () => onOpenLegal("agreement"),
      accent: "gold",
    },
    {
      type: "privacy",
      title: "Политика конфиденциальности",
      subtitle: "Какие данные используются внутри Telegram Mini App",
      action: () => onOpenLegal("privacy"),
      accent: "mint",
    },
    {
      type: "terms",
      title: "Условия использования",
      subtitle: "Доступность сервиса, модерация и изменения функций",
      action: () => onOpenLegal("terms"),
      accent: "pink",
    },
  ];

  return (
    <div className="premium-page settings-premium-page page-enter">
      <PageBackButton onClick={onBack} />

      <section className="settings-hero-premium">
        <div className="settings-hero-glow" />
        <div className="settings-hero-row">
          <SettingsIcon />
          <div>
            <div className="settings-kicker">Панель управления</div>
            <h2>Настройки</h2>
          </div>
        </div>
        <p>
          Помощь, документы сервиса и важные правила барахолки — в одном аккуратном разделе.
        </p>
      </section>

      <section className="settings-premium-list">
        {items.map((item) => (
          <button
            key={item.title}
            className={`settings-premium-tile settings-accent-${item.accent}`}
            onClick={item.action}
          >
            <span className="settings-tile-icon">
              <TileIcon type={item.type} />
            </span>
            <span className="settings-tile-copy">
              <span className="settings-tile-title">{item.title}</span>
              <span className="settings-tile-sub">{item.subtitle}</span>
            </span>
            <span className="settings-tile-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 6.5L14.5 12L9 17.5" />
              </svg>
            </span>
          </button>
        ))}
      </section>

      <div className="settings-version premium-version">Барахолка Mini App · v1.0.0</div>
    </div>
  );
}
