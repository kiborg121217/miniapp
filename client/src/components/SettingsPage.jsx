export default function SettingsPage({
  theme,
  onToggleTheme,
  onOpenHelp,
}) {
  return (
    <div className="help-page page-enter">
      <div className="help-hero">
        <div className="help-badge">Настройки</div>
        <h2>Настройки приложения</h2>
        <p>
          Здесь можно открыть помощь, изменить тему и посмотреть важные документы.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Оформление</div>
        <button onClick={onToggleTheme}>
          Тема: {theme === "dark" ? "Тёмная" : "Светлая"}
        </button>
      </div>

      <div className="help-card">
        <div className="help-card-title">Справка</div>
        <button onClick={onOpenHelp}>Помощь</button>
      </div>

      <div className="help-card">
        <div className="help-card-title">Документы</div>
        <p>Пользовательское соглашение</p>
        <p>Политика конфиденциальности</p>
        <p>Условия использования</p>
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: 24,
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Версия приложения 1.0.0
      </div>
    </div>
  );
}