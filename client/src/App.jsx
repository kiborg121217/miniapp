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

function readJsonCache(key) {
  if (!key || typeof window === "undefined") return null;
  return safeParseJson(safeLocalGetItem(key), null);
}

function writeJsonCache(key, value) {
  if (!key || typeof window === "undefined") return;
  safeLocalSetItem(key, JSON.stringify(value));
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

function withTimeout(taskOrPromise, timeoutMs, fallbackValue = null) {
  const promise =
    typeof taskOrPromise === "function"
      ? Promise.resolve().then(taskOrPromise)
      : Promise.resolve(taskOrPromise);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      resolve(value);
    };

    const timerId = window.setTimeout(() => finish(fallbackValue), timeoutMs);

    promise
      .then((value) => finish(value))
      .catch(() => finish(fallbackValue));
  });
}

function runBackgroundTask(task) {
  const run = () => {
    Promise.resolve()
      .then(task)
      .catch((error) => console.warn("Фоновая задача не выполнена:", error));
  };

  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1800 });
  } else if (typeof window !== "undefined") {
    window.setTimeout(run, 0);
  }
}

function safeStorageGet(storageName, key) {
  if (typeof window === "undefined") return null;

  try {
    return window[storageName]?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeStorageSet(storageName, key, value) {
  if (typeof window === "undefined") return;

  try {
    window[storageName]?.setItem(key, value);
  } catch {
    // ignore unavailable storage
  }
}

function safeStorageRemove(storageName, key) {
  if (typeof window === "undefined") return;

  try {
    window[storageName]?.removeItem(key);
  } catch {
    // ignore unavailable storage
  }
}

function safeSessionGetItem(key) {
  return safeStorageGet("sessionStorage", key);
}

function safeSessionSetItem(key, value) {
  safeStorageSet("sessionStorage", key, value);
}

function safeSessionRemoveItem(key) {
  safeStorageRemove("sessionStorage", key);
}

function safeLocalGetItem(key) {
  return safeStorageGet("localStorage", key);
}

function safeLocalSetItem(key, value) {
  safeStorageSet("localStorage", key, value);
}

function safeParseJson(raw, fallback = null) {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readInitialSessionState() {
  const selectedAd = safeParseJson(safeSessionGetItem("selected_ad"), null);
  const selectedSellerId = safeSessionGetItem("selected_seller_id") || null;
  const profileStatusPage = safeSessionGetItem("profile_status_page") || null;
  const selectedChatId = safeSessionGetItem("selected_chat_id") || null;

  let page = safeSessionGetItem("app_page") || "list";

  const validPages = new Set([
    "list",
    "add",
    "profile",
    "chats",
    "profileAds",
    "settings",
    "help",
    "legal",
    "seller",
    "view",
  ]);

  if (!validPages.has(page)) page = "list";
  if (page === "view" && !selectedAd) page = "list";
  if (page === "seller" && !selectedSellerId) page = "list";
  if (page === "profileAds" && !profileStatusPage) page = "profile";

  return {
    page,
    selectedAd,
    selectedSellerId,
    profileStatusPage,
    selectedChatId,
    sellerBackTarget: safeSessionGetItem("seller_back_target") || "list",
    viewBackTarget: safeSessionGetItem("view_back_target") || "list",
  };
}


export default function App() {
  useTelegramViewport();

  const [initialSession] = useState(readInitialSessionState);
  const [page, setPage] = useState(initialSession.page);
  const [selectedAd, setSelectedAd] = useState(initialSession.selectedAd);
  const [selectedSellerId, setSelectedSellerId] = useState(initialSession.selectedSellerId);
  const [profileStatusPage, setProfileStatusPage] = useState(initialSession.profileStatusPage);
  const [selectedChatId, setSelectedChatId] = useState(initialSession.selectedChatId);
  const [sellerBackTarget, setSellerBackTarget] = useState(initialSession.sellerBackTarget);
  const [viewBackTarget, setViewBackTarget] = useState(initialSession.viewBackTarget);

  const [viewLoading, setViewLoading] = useState(false);

  const [legalType, setLegalType] = useState("agreement");
  const [tgUser, setTgUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootProgress, setBootProgress] = useState(10);
  const [bootSubtitle, setBootSubtitle] = useState("Подготавливаем витрину…");
  const [preloadedAds, setPreloadedAds] = useState(() => readMainAdsCache());
  const [preloadedVerifiedSellerIds, setPreloadedVerifiedSellerIds] = useState([]);
  const [profileCache, setProfileCache] = useState(null);
  const [theme, setTheme] = useState(() => safeLocalGetItem("theme") || "dark");

  useEffect(() => {
    safeSessionSetItem("app_page", page);
  }, [page]);

  useEffect(() => {
    if (selectedSellerId) {
      safeSessionSetItem("selected_seller_id", String(selectedSellerId));
    } else {
      safeSessionRemoveItem("selected_seller_id");
    }
  }, [selectedSellerId]);

  useEffect(() => {
    if (profileStatusPage) {
      safeSessionSetItem("profile_status_page", profileStatusPage);
    } else {
      safeSessionRemoveItem("profile_status_page");
    }
  }, [profileStatusPage]);

  useEffect(() => {
    if (selectedChatId) {
      safeSessionSetItem("selected_chat_id", selectedChatId);
    } else {
      safeSessionRemoveItem("selected_chat_id");
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (selectedAd) {
      safeSessionSetItem("selected_ad", JSON.stringify(selectedAd));
    } else {
      safeSessionRemoveItem("selected_ad");
    }
  }, [selectedAd]);

  useEffect(() => {
    if (sellerBackTarget) {
      safeSessionSetItem("seller_back_target", sellerBackTarget);
    } else {
      safeSessionRemoveItem("seller_back_target");
    }
  }, [sellerBackTarget]);

  useEffect(() => {
    if (viewBackTarget) {
      safeSessionSetItem("view_back_target", viewBackTarget);
    } else {
      safeSessionRemoveItem("view_back_target");
    }
  }, [viewBackTarget]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    safeLocalSetItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (page === "view" && !viewLoading && !selectedAd) {
      setPage("list");
      safeSessionSetItem("app_page", "list");
      safeSessionRemoveItem("selected_ad");
    }

    if (page === "seller" && !selectedSellerId) {
      setPage("list");
      safeSessionSetItem("app_page", "list");
    }

    if (page === "profileAds" && !profileStatusPage) {
      setPage("profile");
      safeSessionSetItem("app_page", "profile");
    }
  }, [page, viewLoading, selectedAd, selectedSellerId, profileStatusPage]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const safeSetProgress = (value, text) => {
      if (cancelled) return;
      setBootProgress(value);
      if (text) setBootSubtitle(text);
    };

    const finishBoot = (text = "Готово") => {
      if (cancelled) return;
      safeSetProgress(100, text);
      timeoutId = window.setTimeout(() => {
        if (!cancelled) setBootLoading(false);
      }, 120);
    };

    const loadFreshApprovedAds = async (timeoutMs) => {
      const data = await withTimeout(() => getAds(), timeoutMs, null);
      if (!Array.isArray(data)) return null;

      const approved = data.filter((ad) => ad.status === "approved");
      writeMainAdsCache(approved);

      if (!cancelled) {
        setPreloadedAds(approved);
      }

      return approved;
    };

    const hydrateSecondaryData = (approvedAds, user) => {
      runBackgroundTask(async () => {
        const adsForHydration = Array.isArray(approvedAds) ? approvedAds : [];

        await preloadFirstAdImages(adsForHydration);

        const sellerIds = [
          ...new Set(
            adsForHydration
              .slice(0, 32)
              .map((ad) => String(ad.userId || ""))
              .filter(Boolean)
          ),
        ];

        const verifiedIds = await Promise.all(
          sellerIds.map(async (sellerId) => {
            const profile = await withTimeout(() => getUserProfile(sellerId), 2400, null);
            return profile?.isVerified ? sellerId : null;
          })
        );

        if (!cancelled) {
          setPreloadedVerifiedSellerIds(verifiedIds.filter(Boolean));
        }

        if (!user?.id) return;

        const [profile, notifications, chats] = await Promise.all([
          withTimeout(() => getUserProfileBundle(user), 5000, null),
          withTimeout(() => getNotificationSettings(user.id), 3200, null),
          withTimeout(() => getUserChatsOnce(user.id, 10), 4200, null),
        ]);

        if (!cancelled && profile) {
          setProfileCache(profile);
        }

        writeUserBootCache(user.id, { profile, notifications, chats });
      });
    };

    const boot = async () => {
      initTelegram();

      if (window.location.pathname === "/auth/callback") {
        finishBoot("Завершаем Telegram-вход…");
        return;
      }

      const tg = window.Telegram?.WebApp;
      let user = null;

      try {
        tg?.ready?.();
        tg?.expand?.();
      } catch {
        // Telegram API может быть недоступен в обычном браузере.
      }

      try {
        const initData = getTelegramInitData();

        if (initData) {
          safeSetProgress(16, "Проверяем Telegram-вход…");
          const auth = await withTimeout(
            () => authenticateMiniAppInitData(initData),
            4200,
            null
          );
          user = auth?.user || null;
        } else {
          safeSetProgress(16, "Проверяем сессию…");
          const session = await withTimeout(() => restoreAuthSession(), 3200, null);
          user = session?.user || null;
        }
      } catch (error) {
        console.warn("Серверная авторизация недоступна, используем данные Telegram WebApp:", error);
      }

      if (!user) {
        user = getTelegramUnsafeUser();
      }

      if (!cancelled) {
        setTgUser(user);
      }

      const startAdId = getStartAdIdFromLaunch();
      const startSellerId = getStartSellerIdFromLaunch();
      const startChatId = getStartChatIdFromLaunch();

      safeSetProgress(24, "Подключаем приложение…");

      if (startSellerId) {
        if (!cancelled) {
          setSelectedSellerId(String(startSellerId));
          setSellerBackTarget("list");
          setPage("seller");
          finishBoot("Открываем профиль продавца…");
        }
        return;
      }

      if (startChatId) {
        if (!cancelled) {
          setSelectedChatId(String(startChatId));
          setPage("chats");
          finishBoot("Открываем чат…");
        }
        return;
      }

      if (startAdId) {
        safeSetProgress(34, "Открываем объявление…");
        const ad = await withTimeout(() => getAdById(startAdId), 5500, null);

        if (!cancelled && ad) {
          setSelectedAd(ad);
          setViewBackTarget("list");
          setPage("view");
          finishBoot("Готово");
          runBackgroundTask(() => preloadImage(getAdPreviewImage(ad), 2200));
          return;
        }

        if (!cancelled) {
          setPage("list");
          setSelectedAd(null);
          safeSessionRemoveItem("selected_ad");
        }
      }

      const cachedAds = readMainAdsCache();

      if (!cancelled && cachedAds.length > 0) {
        safeSetProgress(88, "Показываем сохранённую витрину…");
        setPreloadedAds(cachedAds);
        finishBoot("Готово");

        runBackgroundTask(async () => {
          const approved = await loadFreshApprovedAds(9000);
          hydrateSecondaryData(approved || cachedAds, user);
        });

        return;
      }

      safeSetProgress(36, "Загружаем объявления…");
      const approved = await loadFreshApprovedAds(7200);

      if (!cancelled) {
        if (Array.isArray(approved)) {
          setPreloadedAds(approved);
        } else {
          setPreloadedAds([]);
        }

        finishBoot("Открываем приложение…");
      }

      hydrateSecondaryData(approved || [], user);
    };

    boot().catch((error) => {
      console.error("Ошибка стартовой загрузки:", error);
      finishBoot("Открываем приложение…");
    });

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

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

      safeSessionRemoveItem("selected_seller_id");
      safeSessionRemoveItem("profile_status_page");
      safeSessionRemoveItem("selected_ad");
      safeSessionRemoveItem("selected_chat_id");
      safeSessionRemoveItem("seller_back_target");
      safeSessionRemoveItem("view_back_target");
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

      {page === "profileAds" && tgUser && (
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

      {page === "profileAds" && !tgUser && (
        <LoginPage
          returnPage="profile"
          onBack={() => goToPage("list")}
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

      {page === "view" && !viewLoading && !selectedAd && (
        <LoadingScreen progress={100} subtitle="Восстанавливаем витрину…" />
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