import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Критическая ошибка интерфейса:", error, info);
  }

  handleReset = () => {
    try {
      sessionStorage.removeItem("app_page");
      sessionStorage.removeItem("selected_ad");
      sessionStorage.removeItem("selected_seller_id");
      sessionStorage.removeItem("selected_chat_id");
      sessionStorage.removeItem("profile_status_page");
      sessionStorage.removeItem("seller_back_target");
      sessionStorage.removeItem("view_back_target");
    } catch {
      // ignore storage errors
    }

    window.location.replace("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-crash-screen" role="alert">
          <div className="app-crash-card">
            <div className="app-crash-title">Барахолка</div>
            <p>Интерфейс перезапущен из-за ошибки WebView. Нажмите кнопку ниже, чтобы открыть главную.</p>
            <button type="button" onClick={this.handleReset}>На главную</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
