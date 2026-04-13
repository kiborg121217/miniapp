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
      setLoadingUser(false);
      return;
    }

    tg.ready();

    const checkUser = () => {
      const u = tg.initDataUnsafe?.user;

      if (u) {
        setTgUser(u);
        console.log("USER OK:", u);
        setLoadingUser(false); // ✅ ВАЖНО
      } else {
        console.log("WAITING USER...");
        setTimeout(checkUser, 300);
      }
    };

    checkUser();
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
        <div className="bottom">
          <button onClick={() => setPage("list")}>⌂</button>
          <button onClick={() => setPage("add")}>✚</button>
        </div>
      )}
    </div>
  );
}