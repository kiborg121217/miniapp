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
import { getAdById, getAds, getUserProfile, getUserProfileBundle } from "./firebase";

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
          попытку позже. Если ничего не помогает — обратись в тех. поддержку.
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

function LoadingScreen({ progress = 12, subtitle = "Подготавливаем витрину…" }) {
  return (
    <div className="loading-screen">
      <div className="loading-orb loading-orb-1" />
      <div className="loading-orb loading-orb-2" />
      <div className="loading-card">
        <div className="loading-title">Барахолка</div>
        <div className="loading-subtitle">{subtitle}</div>
        <div className="loading-progress-shell" aria-label="Загрузка приложения">
          <div className="loading-progress-fill" style={{ width: `${Math.max(8, Math.min(100, progress))}%` }} />
        </div>
        <div className="loading-progress-text">{Math.round(progress)}%</div>
      </div>
    </div>
  );
}

function getStartAdIdFromLaunch() {
  const tg = window.Telegram?.WebApp;

  const startParam =
    tg?.initDataUnsafe?.start_param ||
    new URLSearchParams(window.location.search).get("tgWebAppStartParam");

  if (startParam && startParam.startsWith("ad_")) {
    return startParam.replace("ad_", "");
  }

  const queryAd = new URLSearchParams(window.location.search).get("ad");
  if (queryAd) return queryAd;

  return null;
}

function getAdPreviewImage(ad) {
  if (Array.isArray(ad?.imageUrls) && ad.imageUrls.length > 0) return ad.imageUrls[0];
  return ad?.imageUrl || "";
}

function preloadImage(src, timeoutMs = 2800) {
  if (!src) return Promise.resolve(false);

  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    img.onload = async () => {
      window.clearTimeout(timer);
      try {
        if (img.decode) await img.decode();
      } catch {
        // decode не критичен, onload уже сработал
      }
      finish(true);
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      finish(false);
    };

    img.src = src;
  });
}

async function preloadFirstAdImages(ads, onStep) {
  const firstAds = (Array.isArray(ads) ? ads : []).slice(0, 10);

  if (firstAds.length === 0) {
    onStep?.(100);
    return;
  }

  let completed = 0;

  await Promise.allSettled(
    firstAds.map(async (ad) => {
      await preloadImage(getAdPreviewImage(ad));
      completed += 1;
      onStep?.(completed / firstAds.length);
    })
  );
}

export default function App() {
  const [page, setPage] = useState(() => sessionStorage.getItem("app_page") || "list");

  const [selectedAd, setSelectedAd] = useState(() => {
    const saved = sessionStorage.getItem("selected_ad");
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedSellerId, setSelectedSellerId] = useState(
    () => sessionStorage.getItem("selected_seller_id") || null
  );

  const [profileStatusPage, setProfileStatusPage] = useState(
    () => sessionStorage.getItem("profile_status_page") || null
  );

  const [sellerBackTarget, setSellerBackTarget] = useState(
    () => sessionStorage.getItem("seller_back_target") || "list"
  );

  const [legalType, setLegalType] = useState("agreement");
  const [tgUser, setTgUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootProgress, setBootProgress] = useState(10);
  const [bootSubtitle, setBootSubtitle] = useState("Подготавливаем витрину…");
  const [preloadedAds, setPreloadedAds] = useState([]);
  const [preloadedVerifiedSellerIds, setPreloadedVerifiedSellerIds] = useState([]);
  const [profileCache, setProfileCache] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    sessionStorage.setItem("app_page", page);
  }, [page]);

  useEffect(() => {
    if (selectedSellerId) {
      sessionStorage.setItem("selected_seller_id", String(selectedSellerId));
    } else {
      sessionStorage.removeItem("selected_seller_id");
    }
  }, [selectedSellerId]);

  useEffect(() => {
    if (profileStatusPage) {
      sessionStorage.setItem("profile_status_page", profileStatusPage);
    } else {
      sessionStorage.removeItem("profile_status_page");
    }
  }, [profileStatusPage]);

  useEffect(() => {
    if (selectedAd) {
      sessionStorage.setItem("selected_ad", JSON.stringify(selectedAd));
    } else {
      sessionStorage.removeItem("selected_ad");
    }
  }, [selectedAd]);

  useEffect(() => {
    if (sellerBackTarget) {
      sessionStorage.setItem("seller_back_target", sellerBackTarget);
    } else {
      sessionStorage.removeItem("seller_back_target");
    }
  }, [sellerBackTarget]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const safeSetProgress = (value, text) => {
      if (cancelled) return;
      setBootProgress(value);
      if (text) setBootSubtitle(text);
    };

    const boot = async () => {
      initTelegram();

      const tg = window.Telegram?.WebApp;
      let user = null;

      if (tg) {
        tg.ready();
        tg.expand();
        user = tg.initDataUnsafe?.user || null;
        if (!cancelled) {
          setTgUser(user);
        }
      }

      const startAdId = getStartAdIdFromLaunch();

      try {
        safeSetProgress(18, "Подключаем Telegram…");

        if (startAdId) {
          safeSetProgress(34, "Открываем объявление…");
          const ad = await getAdById(startAdId);

          if (!cancelled && ad) {
            setSelectedAd(ad);
            setPage("view");
            await preloadImage(getAdPreviewImage(ad), 2200);
            safeSetProgress(100, "Готово");
            setBootLoading(false);
            return;
          }
        }

        safeSetProgress(30, "Загружаем объявления…");
        const data = await getAds();
        const approved = data.filter((ad) => ad.status === "approved");

        if (!cancelled) {
          setPreloadedAds(approved);
        }

        safeSetProgress(52, "Подготавливаем карточки…");
        await preloadFirstAdImages(approved, (ratio) => {
          safeSetProgress(52 + Math.round(ratio * 30), "Подгружаем фото…");
        });

        safeSetProgress(86, "Проверяем продавцов…");
        const sellerIds = [...new Set(approved.map((ad) => String(ad.userId || "")).filter(Boolean))];
        const verifiedIds = await Promise.all(
          sellerIds.slice(0, 40).map(async (sellerId) => {
            try {
              const profile = await getUserProfile(sellerId);
              return profile?.isVerified ? sellerId : null;
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) {
          setPreloadedVerifiedSellerIds(verifiedIds.filter(Boolean));
        }

        if (user?.id) {
          safeSetProgress(94, "Обновляем профиль…");
          getUserProfileBundle(user)
            .then((data) => {
              if (!cancelled) setProfileCache(data);
            })
            .catch((error) => console.warn("Не удалось заранее загрузить профиль:", error));
        }

        safeSetProgress(100, "Готово");
      } catch (error) {
        console.error("Ошибка стартовой загрузки:", error);
        safeSetProgress(100, "Открываем приложение…");
      }

      timeoutId = setTimeout(() => {
        if (!cancelled) {
          setBootLoading(false);
        }
      }, 250);
    };

    boot();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const goToPage = (nextPage) => {
    setPage(nextPage);

    if (nextPage === "list") {
      setSelectedSellerId(null);
      setProfileStatusPage(null);
      setSelectedAd(null);
      setSellerBackTarget("list");

      sessionStorage.removeItem("selected_seller_id");
      sessionStorage.removeItem("profile_status_page");
      sessionStorage.removeItem("selected_ad");
      sessionStorage.removeItem("seller_back_target");
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (bootLoading) {
    return <LoadingScreen progress={bootProgress} subtitle={bootSubtitle} />;
  }

  return (
    <div className="app theme-animate">
      {page === "list" && (
        <AdList
          onOpenSettings={() => goToPage("settings")}
          onCreate={() => goToPage("add")}
          initialAds={preloadedAds}
          initialVerifiedSellerIds={preloadedVerifiedSellerIds}
          onOpen={(ad) => {
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "add" && <AddAd user={tgUser} onBack={() => goToPage("list")} />}

      {page === "profile" && (
        <ProfilePage
          user={tgUser}
          initialProfileData={profileCache}
          onProfileDataLoaded={setProfileCache}
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
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
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
            setSellerBackTarget("seller");
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
            setSelectedSellerId(String(sellerId));
            setSellerBackTarget("view");
            setPage("seller");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page !== "view" && page !== "add" && (
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