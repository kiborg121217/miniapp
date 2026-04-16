import { useState } from "react";
import AddAd from "./components/AddAd";
import AdList from "./components/AdList";
import AdPage from "./components/AdPage";
import "./App.css";
import { useEffect } from "react";
import { initTelegram } from "./telegram";

export default function App() {
  const [page, setPage] = useState("list");
  const [selectedAd, setSelectedAd] = useState(null);
  const [tgUser, setTgUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      console.log("НЕ TELEGRAM");
      return;
    }

    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;

    console.log("INIT DATA:", tg.initDataUnsafe);
    console.log("USER:", user);

    setTgUser(user || null);
  }, []);

  return (
    <div className="app">
      {page === "list" && (
        <AdList
          onOpen={(ad) => {
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo(0, 0);
          }}
        />
      )}

      {page === "add" && (
        <AddAd user={tgUser} />
      )}

      {page === "view" && (
        <AdPage ad={selectedAd} onBack={() => setPage("list")} />
      )}

      {page !== "view" && (
        <div className="bottom-nav">
          <button
            className={`nav-item ${page === "list" ? "active" : ""}`}
            onClick={() => setPage("list")}
          >
            <span className="nav-icon">▣</span>
            <span className="nav-label">Магазин</span>
          </button>

          <button
            className={`nav-item ${page === "add" ? "active" : ""}`}
            onClick={() => setPage("add")}
          >
            <span className="nav-icon">◉</span>
            <span className="nav-label">Аккаунт</span>
          </button>

          <button
            className="nav-item"
            onClick={() =>
              alert("Для помощи напишите администратору или откройте нужное объявление и нажмите «Написать».")
            }
          >
            <span className="nav-icon">?</span>
            <span className="nav-label">Помощь</span>
          </button>
        </div>
      )}
    </div>
  );
}