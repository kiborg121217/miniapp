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

  useEffect(() => {
  initTelegram();

  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    setTgUser(tg.initDataUnsafe.user);
    console.log("USER SAVED:", tg.initDataUnsafe.user);
  } else {
    console.log("USER NOT FOUND");
  }
}, []);

  return (
    <div className="app">
      {page === "list" && (
        <AdList
          onOpen={(ad) => {
            setSelectedAd(ad);
            setPage("view");
          }}
        />
      )}

      {page === "add" && <AddAd user={tgUser} />}

      {page === "view" && (
        <AdPage ad={selectedAd} onBack={() => setPage("list")} />
      )}

      {page !== "view" && (
        <div className="bottom">
          <button onClick={() => setPage("list")}>🏠</button>
          <button onClick={() => setPage("add")}>＋</button>
        </div>
      )}
    </div>
  );
}