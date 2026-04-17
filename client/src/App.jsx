import { useEffect, useState } from "react";
import AddAd from "./components/AddAd";
import AdList from "./components/AdList";
import AdPage from "./components/AdPage";
import ProfilePage from "./components/ProfilePage";
import SettingsPage from "./components/SettingsPage";
import SellerPage from "./components/SellerPage";
import "./App.css";
import { initTelegram } from "./telegram";

function HelpPage({ onBack }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="page-enter help-page">
      <div className="help-hero">
        <div className="help-badge">Помощь</div>
        <h2>Как пользоваться барахолкой</h2>
        <p>
          Открывай объявления, смотри фото, пиши продавцу напрямую в Telegram и
          размещай свои товары через кнопку создания.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Как купить</div>
        <p>Открой объявление и нажми «Написать».</p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Как разместить</div>
        <p>Нажми «Создать», заполни форму и отправь объявление на модерацию.</p>
      </div>

      <button className="help-primary" onClick={onBack}>
        Назад
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-orb loading-orb-1" />
      <div className="loading-orb loading-orb-2" />
      <div className="loading-card">
        <div className="loading-title">Барахолка</div>
        <div className="loading-subtitle">Подготавливаем витрину…</div>
        <div className="loading-shimmer" />
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("list");
  const [selectedAd, setSelectedAd] = useState(null);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [tgUser, setTgUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    initTelegram();

    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const user = tg.initDataUnsafe?.user || null;
      setTgUser(user);
    }

    const t = setTimeout(() => setBootLoading(false), 950);
    return () => clearTimeout(t);
  }, []);

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (bootLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app theme-animate">
      {page === "list" && (
        <AdList
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          onOpen={(ad) => {
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "add" && <AddAd user={tgUser} />}

      {page === "profile" && (
        <ProfilePage
          user={tgUser}
          onOpenAd={(ad) => {
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "settings" && (
        <SettingsPage
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          onOpenHelp={() => goToPage("help")}
        />
      )}

      {page === "help" && <HelpPage onBack={() => goToPage("settings")} />}

      {page === "seller" && (
        <SellerPage
          sellerId={selectedSellerId}
          onOpenAd={(ad) => {
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "view" && (
        <AdPage
          ad={selectedAd}
          onBack={() => {
            setPage("list");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
          onOpenSeller={(sellerId) => {
            setSelectedSellerId(sellerId);
            setPage("seller");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page !== "view" && (
        <div className="bottom-nav">
          <button
            className={`nav-item ${page === "list" ? "active" : ""}`}
            onClick={() => goToPage("list")}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="5" y="4.5" width="14" height="15" rx="3.5" />
                <path d="M8.5 9.5H15.5" />
                <path d="M8.5 13H15.5" />
                <path d="M10 7.25H14" />
              </svg>
            </span>
            <span className="nav-label">Главная</span>
          </button>

          <button
            className={`nav-item ${page === "add" ? "active" : ""}`}
            onClick={() => goToPage("add")}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 7V17" />
                <path d="M7 12H17" />
                <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
              </svg>
            </span>
            <span className="nav-label">Создать</span>
          </button>

          <button
            className={`nav-item ${page === "profile" ? "active" : ""}`}
            onClick={() => goToPage("profile")}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8.2" r="3.2" />
                <path d="M5.5 18.5C6.8 15.7 9.1 14.5 12 14.5C14.9 14.5 17.2 15.7 18.5 18.5" />
              </svg>
            </span>
            <span className="nav-label">Профиль</span>
          </button>
        </div>
      )}

      {page === "list" && (
        <button
          className="theme-toggle floating-theme-toggle"
          onClick={() => goToPage("settings")}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6a3.8 3.8 0 0 0 0-7.6Z" />
            <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 1 1-1.7 1.7l-.1-.1a1 1 0 0 0-1.1-.2a1 1 0 0 0-.6.9V19a1.2 1.2 0 1 1-2.4 0v-.2a1 1 0 0 0-.7-.9a1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 1 1-1.7-1.7l.1-.1a1 1 0 0 0 .2-1.1a1 1 0 0 0-.9-.6H5a1.2 1.2 0 1 1 0-2.4h.2a1 1 0 0 0 .9-.7a1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 1 1 1.7-1.7l.1.1a1 1 0 0 0 1.1.2a1 1 0 0 0 .6-.9V5a1.2 1.2 0 1 1 2.4 0v.2a1 1 0 0 0 .7.9a1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 1 1 1.7 1.7l-.1.1a1 1 0 0 0-.2 1.1a1 1 0 0 0 .9.6H19a1.2 1.2 0 1 1 0 2.4h-.2a1 1 0 0 0-.9.7Z" />
          </svg>
        </button>
      )}
    </div>
  );
}