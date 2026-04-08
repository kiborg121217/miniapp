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

  useEffect(() => {
  initTelegram();
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

      {page === "add" && <AddAd />}

      {page === "view" && (
        <AdPage ad={selectedAd} onBack={() => setPage("list")} />
      )}

      <div className="bottom">
        <button onClick={() => setPage("list")}>🏠</button>
        <button onClick={() => setPage("add")}>＋</button>
      </div>
    </div>
  );
}