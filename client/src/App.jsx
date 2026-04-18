import { useEffect, useState } from "react";
import AddAd from "./components/AddAd";
import AdList from "./components/AdList";
import AdPage from "./components/AdPage";
import ProfilePage from "./components/ProfilePage";
import ProfileAdsPage from "./components/ProfileAdsPage";
import SettingsPage from "./components/SettingsPage";
import SellerPage from "./components/SellerPage";
import LegalPage from "./components/LegalPage";
import PageBackButton from "./components/PageBackButton";
import "./App.css";
import { initTelegram } from "./telegram";

function HelpPage({ onBack }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="page-enter help-page">
      <PageBackButton onClick={onBack} />

      <div className="help-hero">
        <div className="help-badge">Помощь</div>
        <h2>Как пользоваться барахолкой</h2>
        <p>
          Здесь можно покупать и продавать товары через Telegram. Все объявления
          проходят модерацию перед публикацией.
        </p>
      </div>

        <div className="help-card">
        <div className="help-card-title">Что делать, если что-то не работает</div>
        <p>
          Попробуй обновить страницу или закрыть и заново открыть мини-приложение через Telegram.
          Если проблема сохраняется, проверь подключение к интернету и повтори
          попытку позже. Если ничего не помогает - обратись в тех. поддержку.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Как посмотреть объявления</div>
        <p>
          На главной странице отображаются все опубликованные объявления. Нажми
          на карточку, чтобы открыть полное описание, посмотреть фото и перейти
          к профилю продавца.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Как разместить объявление</div>
        <p>
          Нажми кнопку «Создать», заполни название, цену, описание и добавь фото.
          После отправки объявление уйдёт на модерацию. После проверки оно будет
          либо опубликовано, либо отклонено.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Как написать продавцу</div>
        <p>
          Если у продавца указан username Telegram, кнопка «Написать» откроет
          его профиль в Telegram. Для пользователей без username в будущем может
          использоваться связь через бота-посредника.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Что есть в профиле</div>
        <p>
          В профиле можно посмотреть свои объявления по категориям: активные,
          архивные, на модерации и отклонённые. Также можно изменить имя в
          профиле, загрузить аватарку и управлять своими объявлениями.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Что такое просмотры</div>
        <p>
          У каждого объявления отображается количество просмотров. Просмотр
          засчитывается при открытии объявления пользователем и используется
          только для внутренней статистики сервиса.
        </p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Почему объявление не опубликовано сразу</div>
        <p>
          Все объявления проходят предварительную модерацию. Это нужно для защиты
          пользователей от спама, мошенничества, запрещённых товаров и
          недостоверной информации.
        </p>
      </div>
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
  const [page, setPage] = useState(() => localStorage.getItem("app_page") || "list");
  const [selectedAd, setSelectedAd] = useState(() => {
  const saved = localStorage.getItem("selected_ad");
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedSellerId, setSelectedSellerId] = useState(
    () => localStorage.getItem("selected_seller_id") || null
  );
  const [sellerBackTarget, setSellerBackTarget] = useState("list");
  const [profileStatusPage, setProfileStatusPage] = useState(
    () => localStorage.getItem("profile_status_page") || null
  );
  const [legalType, setLegalType] = useState("agreement");
  const [tgUser, setTgUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    localStorage.setItem("app_page", page);
  }, [page]);

  useEffect(() => {
    if (selectedSellerId) {
      localStorage.setItem("selected_seller_id", String(selectedSellerId));
    }
  }, [selectedSellerId]);

  useEffect(() => {
    if (profileStatusPage) {
      localStorage.setItem("profile_status_page", profileStatusPage);
    }
  }, [profileStatusPage]);

  useEffect(() => {
    if (selectedAd) {
      localStorage.setItem("selected_ad", JSON.stringify(selectedAd));
    } else {
      localStorage.removeItem("selected_ad");
    }
  }, [selectedAd]);

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

      if (nextPage === "list") {
        setSelectedSellerId(null);
        setProfileStatusPage(null);
        setSelectedAd(null);

        localStorage.removeItem("selected_seller_id");
        localStorage.removeItem("profile_status_page");
        localStorage.removeItem("selected_ad");
      }

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
          onOpenSettings={() => goToPage("settings")}
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
          onOpenSection={(status) => {
            setProfileStatusPage(status);
            setPage("profileAds");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "profileAds" && (
        <ProfileAdsPage
          user={tgUser}
          status={profileStatusPage}
          onBack={() => goToPage("profile")}
          onOpenAd={(ad) => {
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "settings" && (
        <SettingsPage
          onBack={() => goToPage("list")}
          onOpenHelp={() => goToPage("help")}
          onOpenLegal={(type) => {
            setLegalType(type);
            setPage("legal");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "help" && <HelpPage onBack={() => goToPage("settings")} />}

      {page === "legal" && (
        <LegalPage
          type={legalType}
          onBack={() => goToPage("settings")}
        />
      )}

      {page === "seller" && (
        <SellerPage
          sellerId={selectedSellerId}
          onBack={() => {
            setPage(sellerBackTarget === "view" ? "view" : "list");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
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
          currentUser={tgUser}
          onBack={() => {
            setPage("list");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
          onOpenSeller={(sellerId) => {
            setSelectedSellerId(sellerId);
            setSellerBackTarget("view");
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
            className={`nav-item ${page === "profile" || page === "profileAds" ? "active" : ""}`}
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
    </div>
  );
}