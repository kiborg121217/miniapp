import PageBackButton from "./PageBackButton";

export default function SettingsPage({
  onOpenHelp,
  onOpenLegal,
  onBack,
}) {
  return (
    <div className="help-page page-enter">
      <PageBackButton onClick={onBack} />

      <div className="help-hero">
        <div className="help-badge">Настройки</div>
        <h2>Настройки приложения</h2>
        <p>
          Здесь можно открыть помощь и посмотреть документы сервиса.
        </p>
      </div>

      <div className="settings-list">
        <button className="settings-tile" onClick={onOpenHelp}>
          <div className="settings-tile-title">Помощь</div>
          <div className="settings-tile-sub">Как пользоваться приложением</div>
        </button>

        <button className="settings-tile legal-tile" onClick={() => onOpenLegal("agreement")}>
          <div className="settings-tile-title">Пользовательское соглашение</div>
          <div className="settings-tile-sub">Открыть документ</div>
        </button>

        <button className="settings-tile legal-tile" onClick={() => onOpenLegal("privacy")}>
          <div className="settings-tile-title">Политика конфиденциальности</div>
          <div className="settings-tile-sub">Открыть документ</div>
        </button>

        <button className="settings-tile legal-tile" onClick={() => onOpenLegal("terms")}>
          <div className="settings-tile-title">Условия использования</div>
          <div className="settings-tile-sub">Открыть документ</div>
        </button>
      </div>

      <div className="settings-version">Версия приложения 1.0.0</div>
    </div>
  );
}