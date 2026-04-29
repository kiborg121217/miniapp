import { Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Критическая ошибка приложения:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen app-error-state">
          <div className="loading-card">
            <div className="loading-title">Барахолка</div>
            <div className="loading-subtitle">
              Не удалось открыть страницу. Вернитесь на главную и обновите витрину.
            </div>
            <button
              type="button"
              className="app-error-button"
              onClick={() => {
                try {
                  window.sessionStorage.clear();
                } catch {
                  // ignore unavailable storage
                }

                window.location.replace("/");
              }}
            >
              На главную
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
