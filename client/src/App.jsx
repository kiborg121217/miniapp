import { useEffect, useState } from "react";
import AddAd from "./components/AddAd";
import AdList from "./components/AdList";
import AdPage from "./components/AdPage";
import "./App.css";
import { initTelegram } from "./telegram";

export default function App() {
  const [page, setPage] = useState("list");
  const [selectedAd, setSelectedAd] = useState(null);
  const [tgUser, setTgUser] = useState(null);

  useEffect(() => {
    initTelegram();

    const tg = window.Telegram?.WebApp;

    if (!tg) return;

    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user || null;
    setTgUser(user);

    console.log("INIT DATA:", tg.initDataUnsafe);
    console.log("USER:", user);
  }, []);

  return (
    <div className="app">
      {page === "list" && (
        <AdList
          onOpen={(ad) => {
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {page === "add" && <AddAd user={tgUser} />}

      {page === "view" && (
        <AdPage
          ad={selectedAd}
          onBack={() => {
            setPage("list");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {page !== "view" && (
        <div className="bottom-nav">
          <button
            className={`nav-item ${page === "list" ? "active" : ""}`}
            onClick={() => setPage("list")}
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
            onClick={() => setPage("add")}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8.2" r="3.2" />
                <path d="M5.5 18.5C6.8 15.7 9.1 14.5 12 14.5C14.9 14.5 17.2 15.7 18.5 18.5" />
              </svg>
            </span>
            <span className="nav-label">Создать</span>
          </button>

          <button
            className="nav-item"
            onClick={() =>
              alert(
                "Нужна помощь? Открой объявление и нажми «Написать» или свяжись с администратором."
              )
            }
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" />
                <path d="M9.7 9.3C10 8.3 10.9 7.6 12 7.6C13.3 7.6 14.3 8.5 14.3 9.7C14.3 10.7 13.8 11.3 12.9 11.9C12.2 12.4 12 12.8 12 13.6" />
                <circle cx="12" cy="16.6" r="0.7" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="nav-label">Помощь</span>
          </button>
        </div>
      )}
    </div>
  );
}