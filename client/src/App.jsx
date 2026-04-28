import { useEffect, useState } from "react";
import AddAd from "./components/AddAd";
import AdList from "./components/AdList";
import AdPage from "./components/AdPage";
import ProfilePage from "./components/ProfilePage";
import ProfileAdsPage from "./components/ProfileAdsPage";
import SettingsPage from "./components/SettingsPage";
import ChatsPage from "./components/ChatsPage";
import SellerPage from "./components/SellerPage";
import LegalPage from "./components/LegalPage";
import PageBackButton from "./components/PageBackButton";
import LoginPage from "./components/LoginPage";
import AuthCallbackPage from "./components/AuthCallbackPage";
import "./App.css";
import { initTelegram } from "./telegram";
import useTelegramViewport from "./hooks/useTelegramViewport";
import { getAdById, getAds, getNotificationSettings, getUserChatsOnce, getUserProfile, getUserProfileBundle, startChatForAd } from "./firebase";
import {
  authenticateMiniAppInitData,
  getTelegramInitData,
  getTelegramUnsafeUser,
  restoreAuthSession,
} from "./auth";

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
          Кнопка «Написать» создаёт внутренний диалог по объявлению. Чат работает
          прямо внутри Mini App, поэтому продавцу можно написать даже без Telegram username.
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

function AdOpeningScreen({ onBack }) {
  return (
    <div className="page-enter ad-opening-page">
      <PageBackButton onClick={onBack} />
      <section className="ad-opening-card">
        <div className="ad-opening-spinner" aria-hidden="true" />
        <h2>Открываем объявление</h2>
        <p>Подготавливаем объявление…</p>
      </section>
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


function getStartSellerIdFromLaunch() {
  const tg = window.Telegram?.WebApp;

  const startParam =
    tg?.initDataUnsafe?.start_param ||
    new URLSearchParams(window.location.search).get("tgWebAppStartParam");

  if (startParam && startParam.startsWith("seller_")) {
    return startParam.replace("seller_", "");
  }

  const querySeller = new URLSearchParams(window.location.search).get("seller");
  if (querySeller) return querySeller;

  return null;
}

function getStartChatIdFromLaunch() {
  const tg = window.Telegram?.WebApp;

  const startParam =
    tg?.initDataUnsafe?.start_param ||
    new URLSearchParams(window.location.search).get("tgWebAppStartParam");

  if (startParam && startParam.startsWith("chat_")) {
    return startParam.replace("chat_", "");
  }

  const queryChat = new URLSearchParams(window.location.search).get("chat");
  if (queryChat) return queryChat;

  return null;
}


const MAIN_CACHE_KEY = "baraholka_main_ads_v2";
const PROFILE_CACHE_PREFIX = "baraholka_profile_bundle_v1";
const NOTIFICATION_CACHE_KEY = "baraholka_notification_settings_v1";
const CHAT_CACHE_PREFIX = "baraholka_user_chats_v1";

function readSafeStorageValue(storage, key, fallback = null) {
  try {
    return storage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSafeStorageValue(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function readInitialPage() {
  const allowedPages = new Set(["list", "add", "profile", "chats", "settings", "help", "legal"]);
  const saved = readSafeStorageValue(sessionStorage, "app_page", "list");
  return allowedPages.has(saved) ? saved : "list";
}

function shouldShowBootScreen() {
  try {
    return sessionStorage.getItem("baraholka_boot_shown_v12") !== "1";
  } catch {
    return false;
  }
}

function markBootScreenShown() {
  try {
    sessionStorage.setItem("baraholka_boot_shown_v12", "1");
  } catch {
    // ignore storage errors
  }
}

function withTimeout(promise, timeoutMs, fallback = null) {
  let timerId;
  const timeout = new Promise((resolve) => {
    timerId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timerId));
}

function readJsonCache(key) {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJsonCache(key, value) {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore cache errors
  }
}

function readMainAdsCache() {
  const cached = readJsonCache(MAIN_CACHE_KEY);
  return Array.isArray(cached?.ads) ? cached.ads : [];
}

function writeMainAdsCache(ads) {
  writeJsonCache(MAIN_CACHE_KEY, { ads: Array.isArray(ads) ? ads : [], cachedAt: Date.now() });
}

function writeUserBootCache(userId, { profile, notifications, chats } = {}) {
  if (!userId) return;
  if (profile) writeJsonCache(`${PROFILE_CACHE_PREFIX}_${userId}`, profile);
  if (notifications) writeJsonCache(`${NOTIFICATION_CACHE_KEY}_${userId}`, notifications);
  if (chats) writeJsonCache(`${CHAT_CACHE_PREFIX}_${userId}`, { chats, cachedAt: Date.now() });
}


function getAdPreviewImage(ad) {
  if (Array.isArray(ad?.imageUrls) && ad.imageUrls.length > 0) return ad.imageUrls[0];
  return ad?.imageUrl || "";
}

function markImagePreloaded(src) {
  if (!src || typeof window === "undefined") return;
  if (!window.__PRELOADED_AD_IMAGES) window.__PRELOADED_AD_IMAGES = new Set();
  window.__PRELOADED_AD_IMAGES.add(src);
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
      markImagePreloaded(src);
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
  const firstAds = (Array.isArray(ads) ? ads : []).slice(0, 15);

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
  useTelegramViewport();
  const [page, setPage] = useState(readInitialPage);

  const [selectedAd, setSelectedAd] = useState(() => {
    try {
      const saved = readSafeStorageValue(sessionStorage, "selected_ad", null);
      return saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem("selected_ad");
      return null;
    }
  });

  const [selectedSellerId, setSelectedSellerId] = useState(
    () => readSafeStorageValue(sessionStorage, "selected_seller_id", null)
  );

  const [profileStatusPage, setProfileStatusPage] = useState(
    () => readSafeStorageValue(sessionStorage, "profile_status_page", null)
  );

  const [selectedChatId, setSelectedChatId] = useState(
    () => readSafeStorageValue(sessionStorage, "selected_chat_id", null)
  );

  const [sellerBackTarget, setSellerBackTarget] = useState(
    () => readSafeStorageValue(sessionStorage, "seller_back_target", "list") || "list"
  );

  const [viewBackTarget, setViewBackTarget] = useState(
    () => readSafeStorageValue(sessionStorage, "view_back_target", "list") || "list"
  );

  const [viewLoading, setViewLoading] = useState(false);

  const [legalType, setLegalType] = useState("agreement");
  const [tgUser, setTgUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(() => shouldShowBootScreen());
  const [bootProgress, setBootProgress] = useState(10);
  const [bootSubtitle, setBootSubtitle] = useState("Подготавливаем витрину…");
  const [preloadedAds, setPreloadedAds] = useState(() => readMainAdsCache());
  const [preloadedVerifiedSellerIds, setPreloadedVerifiedSellerIds] = useState([]);
  const [profileCache, setProfileCache] = useState(null);
  const [theme, setTheme] = useState(() => readSafeStorageValue(localStorage, "theme", "dark") || "dark");

  useEffect(() => {
    writeSafeStorageValue(sessionStorage, "app_page", page);
  }, [page]);

  useEffect(() => {
    if (selectedSellerId) {
      writeSafeStorageValue(sessionStorage, "selected_seller_id", String(selectedSellerId));
    } else {
      sessionStorage.removeItem("selected_seller_id");
    }
  }, [selectedSellerId]);

  useEffect(() => {
    if (profileStatusPage) {
      writeSafeStorageValue(sessionStorage, "profile_status_page", profileStatusPage);
    } else {
      sessionStorage.removeItem("profile_status_page");
    }
  }, [profileStatusPage]);

  useEffect(() => {
    if (selectedChatId) {
      writeSafeStorageValue(sessionStorage, "selected_chat_id", selectedChatId);
    } else {
      sessionStorage.removeItem("selected_chat_id");
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (selectedAd) {
      writeSafeStorageValue(sessionStorage, "selected_ad", JSON.stringify(selectedAd));
    } else {
      sessionStorage.removeItem("selected_ad");
    }
  }, [selectedAd]);

  useEffect(() => {
    if (sellerBackTarget) {
      writeSafeStorageValue(sessionStorage, "seller_back_target", sellerBackTarget);
    } else {
      sessionStorage.removeItem("seller_back_target");
    }
  }, [sellerBackTarget]);

  useEffect(() => {
    if (viewBackTarget) {
      writeSafeStorageValue(sessionStorage, "view_back_target", viewBackTarget);
    } else {
      sessionStorage.removeItem("view_back_target");
    }
  }, [viewBackTarget]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeSafeStorageValue(localStorage, "theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    let closeTimer = null;
    let hardStopTimer = null;

    markBootScreenShown();

    const safeSetProgress = (value, text) => {
      if (cancelled) return;
      setBootProgress(Math.max(8, Math.min(100, value)));
      if (text) setBootSubtitle(text);
    };

    const finishBoot = () => {
      if (cancelled) return;

      safeSetProgress(100, "Готово");

      if (closeTimer) window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (!cancelled) setBootLoading(false);
      }, 180);
    };

    const forceHome = () => {
      setSelectedAd(null);
      setSelectedSellerId(null);
      setProfileStatusPage(null);
      setSelectedChatId(null);
      setViewLoading(false);
      setPage("list");
      sessionStorage.removeItem("app_page");
      sessionStorage.removeItem("selected_seller_id");
      sessionStorage.removeItem("profile_status_page");
      sessionStorage.removeItem("selected_ad");
      sessionStorage.removeItem("selected_chat_id");
      sessionStorage.removeItem("seller_back_target");
      sessionStorage.removeItem("view_back_target");
    };

    const refreshAfterOpen = async (user) => {
      try {
        const data = await withTimeout(getAds(), 5000, readMainAdsCache());
        const approved = Array.isArray(data) ? data.filter((ad) => ad.status === "approved") : [];

        if (approved.length > 0) {
          writeMainAdsCache(approved);
          if (!cancelled) setPreloadedAds(approved);
          preloadFirstAdImages(approved).catch(() => {});
        }

        if (user?.id) {
          Promise.allSettled([
            getUserProfileBundle(user),
            getNotificationSettings(user.id),
            getUserChatsOnce(user.id, 10),
          ]).then((results) => {
            if (cancelled) return;

            const profileResult = results[0];
            const notificationResult = results[1];
            const chatsResult = results[2];

            if (profileResult?.status === "fulfilled") {
              setProfileCache(profileResult.value);
            }

            writeUserBootCache(user.id, {
              profile: profileResult?.status === "fulfilled" ? profileResult.value : null,
              notifications: notificationResult?.status === "fulfilled" ? notificationResult.value : null,
              chats: chatsResult?.status === "fulfilled" ? chatsResult.value : null,
            });
          });
        }
      } catch (error) {
        console.warn("Фоновое обновление данных не выполнено:", error);
      }
    };

    hardStopTimer = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("Стартовая загрузка остановлена принудительно, открываем главную.");
        forceHome();
        setBootLoading(false);
      }
    }, 1800);

    const boot = async () => {
      try {
        initTelegram();

        if (window.location.pathname === "/auth/callback") {
          safeSetProgress(100, "Завершаем Telegram-вход…");
          setBootLoading(false);
          return;
        }

        const tg = window.Telegram?.WebApp;

        try {
          tg?.ready?.();
          tg?.expand?.();
        } catch {
          // ignore old Telegram clients
        }

        const cachedAds = readMainAdsCache();
        if (!cancelled && cachedAds.length > 0) {
          setPreloadedAds(cachedAds);
        }

        safeSetProgress(18, "Подключаем Telegram…");

        let user = null;

        try {
          const initData = getTelegramInitData();

          if (initData) {
            safeSetProgress(32, "Проверяем вход…");
            const auth = await withTimeout(authenticateMiniAppInitData(initData), 900, null);
            user = auth?.user || null;
          } else {
            safeSetProgress(32, "Проверяем сессию…");
            const session = await withTimeout(restoreAuthSession().catch(() => null), 700, null);
            user = session?.user || null;
          }
        } catch (error) {
          console.warn("Авторизация недоступна, используем данные Telegram:", error);
        }

        if (!user) {
          user = getTelegramUnsafeUser();
        }

        if (!cancelled) {
          setTgUser(user);
        }

        safeSetProgress(62, cachedAds.length > 0 ? "Открываем сохранённые данные…" : "Открываем витрину…");

        const startAdId = getStartAdIdFromLaunch();
        const startSellerId = getStartSellerIdFromLaunch();
        const startChatId = getStartChatIdFromLaunch();

        if (startSellerId) {
          setSelectedSellerId(String(startSellerId));
          setSellerBackTarget("list");
          setPage("seller");
        } else if (startChatId) {
          setSelectedChatId(String(startChatId));
          setPage("chats");
        } else if (startAdId) {
          const ad = await withTimeout(getAdById(startAdId), 900, null);
          if (ad) {
            setSelectedAd(ad);
            setPage("view");
          } else {
            setPage("list");
          }
        } else {
          const safePages = new Set(["list", "add", "profile", "chats", "settings", "help", "legal"]);
          setPage((current) => (safePages.has(current) ? current : "list"));
        }

        if (hardStopTimer) window.clearTimeout(hardStopTimer);
        finishBoot();
        refreshAfterOpen(user);
      } catch (error) {
        console.error("Ошибка стартовой загрузки:", error);
        forceHome();
        if (hardStopTimer) window.clearTimeout(hardStopTimer);
        finishBoot();
      }
    };

    boot();

    return () => {
      cancelled = true;
      if (closeTimer) window.clearTimeout(closeTimer);
      if (hardStopTimer) window.clearTimeout(hardStopTimer);
    };
  }, []);

  useEffect(() => {
    if (bootLoading) return;

    if (page === "view" && !viewLoading && !selectedAd) {
      setSelectedAd(null);
      setPage("list");
      return;
    }

    if (page === "seller" && !selectedSellerId) {
      setPage("list");
      return;
    }

    if (page === "profileAds" && !profileStatusPage) {
      setPage(tgUser ? "profile" : "list");
    }
  }, [bootLoading, page, profileStatusPage, selectedAd, selectedSellerId, tgUser, viewLoading]);

  const handleAuthSuccess = (user, profile = null) => {
    setTgUser(user || null);

    setProfileCache(null);

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goToPage = (nextPage) => {
    setPage(nextPage);

    if (nextPage === "list") {
      setSelectedSellerId(null);
      setProfileStatusPage(null);
      setSelectedAd(null);
      setSelectedChatId(null);
      setSellerBackTarget("list");
      setViewBackTarget("list");
      setViewLoading(false);

      sessionStorage.removeItem("selected_seller_id");
      sessionStorage.removeItem("profile_status_page");
      sessionStorage.removeItem("selected_ad");
      sessionStorage.removeItem("selected_chat_id");
      sessionStorage.removeItem("seller_back_target");
      sessionStorage.removeItem("view_back_target");
    }

    if (nextPage !== "chats") {
      setSelectedChatId(null);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const backFromAd = () => {
    setViewLoading(false);

    if (viewBackTarget === "chat") {
      setPage("chats");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (viewBackTarget === "profileAds") {
      setPage("profileAds");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (viewBackTarget === "seller") {
      setPage("seller");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    goToPage("list");
  };

  const handleOpenAdFromChat = async (adId) => {
    setViewBackTarget("chat");
    setViewLoading(true);
    setSelectedAd(null);
    setPage("view");
    window.scrollTo({ top: 0, behavior: "auto" });

    try {
      const ad = await getAdById(adId, { includeInactive: true });
      if (!ad) throw new Error("Объявление не найдено или было удалено");
      setSelectedAd(ad);
    } catch (error) {
      alert(error.message || "Не удалось открыть объявление");
      setPage("chats");
    } finally {
      setViewLoading(false);
    }
  };

  const handleStartChat = async (ad) => {
    if (!tgUser?.id) {
      setSelectedAd(ad || null);
      setPage("chats");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    try {
      const chat = await startChatForAd(ad, tgUser);
      setSelectedChatId(chat.id);
      setPage("chats");
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      alert(error.message || "Не удалось открыть чат");
    }
  };

  if (window.location.pathname === "/auth/callback") {
    return (
      <AuthCallbackPage
        onBack={() => {
          window.history.replaceState({}, "", "/");
          setPage("list");
          setBootLoading(false);
        }}
        onDone={(user, profile, returnPage) => {
          handleAuthSuccess(user, profile);
          const allowedReturnPages = ["add", "profile", "chats"];
          setPage(allowedReturnPages.includes(returnPage) ? returnPage : "profile");
          setBootLoading(false);
        }}
      />
    );
  }

  if (bootLoading) {
    return <LoadingScreen progress={bootProgress} subtitle={bootSubtitle} />;
  }

  return (
    <div className={`app theme-animate ${page === "chats" && selectedChatId ? "chat-open" : ""}`}>
      {page === "list" && (
        <AdList
          onOpenSettings={() => goToPage("settings")}
          onCreate={() => goToPage("add")}
          initialAds={preloadedAds}
          initialVerifiedSellerIds={preloadedVerifiedSellerIds}
          currentUser={tgUser}
          onOpen={(ad) => {
            setSelectedChatId(null);
            setViewBackTarget("list");
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "add" && (
        tgUser ? (
          <AddAd user={tgUser} onBack={() => goToPage("list")} />
        ) : (
          <LoginPage
            returnPage="add"
            onBack={() => goToPage("list")}
          />
        )
      )}

      {page === "profile" && (
        tgUser ? (
          <ProfilePage
            user={tgUser}
            initialProfileData={profileCache}
            onProfileDataLoaded={setProfileCache}
            onOpenSection={(status) => {
              setProfileStatusPage(status);
              setPage("profileAds");
              window.scrollTo({ top: 0, behavior: "auto" });
            }}
            onOpenChats={() => goToPage("chats")}
          />
        ) : (
          <LoginPage
            returnPage="profile"
            onBack={() => goToPage("list")}
          />
        )
      )}

      {page === "chats" && (
        tgUser ? (
          <ChatsPage
            user={tgUser}
            selectedChatId={selectedChatId}
            onSelectChat={(chatId) => setSelectedChatId(chatId)}
            onBackToList={() => setSelectedChatId(null)}
            onOpenAd={handleOpenAdFromChat}
          />
        ) : (
          <LoginPage
            returnPage="chats"
            onBack={() => goToPage("list")}
          />
        )
      )}

      {page === "profileAds" && (
        <ProfileAdsPage
          user={tgUser}
          status={profileStatusPage}
          onBack={() => goToPage("profile")}
          onOpenAd={(ad) => {
            setSelectedChatId(null);
            setViewBackTarget("profileAds");
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "settings" && (
        <SettingsPage
          user={tgUser}
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
            setSelectedChatId(null);
            setViewBackTarget("seller");
            setSelectedAd(ad);
            setSellerBackTarget("seller");
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page === "view" && viewLoading && <AdOpeningScreen onBack={backFromAd} />}

      {page === "view" && !viewLoading && selectedAd && (
        <AdPage
          ad={selectedAd}
          currentUser={tgUser}
          onBack={backFromAd}
          onOpenSeller={(sellerId) => {
            setSelectedChatId(null);
            setSelectedSellerId(String(sellerId));
            setSellerBackTarget("view");
            setPage("seller");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
          onWrite={handleStartChat}
        />
      )}

      {page === "view" && !viewLoading && !selectedAd && (
        <AdList
          onOpenSettings={() => goToPage("settings")}
          onCreate={() => goToPage("add")}
          initialAds={preloadedAds}
          initialVerifiedSellerIds={preloadedVerifiedSellerIds}
          currentUser={tgUser}
          onOpen={(ad) => {
            setSelectedChatId(null);
            setViewBackTarget("list");
            setSelectedAd(ad);
            setPage("view");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {page !== "view" && !(page === "add" && tgUser) && !(page === "chats" && selectedChatId) && (
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
            className={`nav-item ${page === "chats" ? "active" : ""}`}
            onClick={() => goToPage("chats")}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 6.8C5 5.25 6.25 4 7.8 4H16.2C17.75 4 19 5.25 19 6.8V12.2C19 13.75 17.75 15 16.2 15H11L7 18.5V15H7.8C6.25 15 5 13.75 5 12.2V6.8Z" />
                <path d="M8.5 8.5H15.5" />
                <path d="M8.5 11.2H13.5" />
              </svg>
            </span>
            <span className="nav-label">Чаты</span>
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