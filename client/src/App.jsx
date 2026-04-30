import { useEffect, useMemo, useState } from "react";
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
import {
  getAdById,
  getUserProfileBundle,
  getUserChatsOnce,
  startChatForAd,
} from "./firebase";
import { getDebugLog, clearDebugLog, logDebugEvent } from "./debugLog";
import {
  authenticateMiniAppInitData,
  getStoredAuthSession,
  getTelegramInitData,
  getTelegramUnsafeUser,
  restoreAuthSession,
} from "./auth";

const VALID_PAGES = new Set([
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

function DebugPage({ onBack }) {
  const [items, setItems] = useState(() => getDebugLog().slice().reverse());

  const refresh = () => setItems(getDebugLog().slice().reverse());
  const clear = () => {
    clearDebugLog();
    setItems([]);
  };

  return (
    <div className="debug-page page-enter">
      <PageBackButton onClick={onBack} />
      <section className="debug-card">
        <div className="debug-head">
          <div>
            <p className="debug-kicker">Диагностика</p>
            <h1>Последние события приложения</h1>
          </div>
          <span>{items.length}/100</span>
        </div>
        <p className="debug-note">
          Если снова был чёрный экран или повторная загрузка, откройте эту страницу и отправьте последние события разработчику.
        </p>
        <div className="debug-actions">
          <button type="button" onClick={refresh}>Обновить</button>
          <button type="button" onClick={clear}>Очистить</button>
        </div>
        <div className="debug-log-list">
          {items.length === 0 ? (
            <div className="debug-empty">Лог пока пуст.</div>
          ) : (
            items.map((item) => (
              <details key={item.id} className="debug-log-item">
                <summary>
                  <span>{item.type}</span>
                  <small>{new Date(item.ts).toLocaleString("ru-RU")}</small>
                </summary>
                <pre>{JSON.stringify(item, null, 2)}</pre>
              </details>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
function getStartAdIdFromLaunch() {
  const tg = window.Telegram?.WebApp;
  const params = new URLSearchParams(window.location.search);
  const startParam = tg?.initDataUnsafe?.start_param || params.get("tgWebAppStartParam");

  if (startParam && startParam.startsWith("ad_")) return startParam.replace("ad_", "");
  return params.get("ad") || null;
}

function getStartSellerIdFromLaunch() {
  const tg = window.Telegram?.WebApp;
  const params = new URLSearchParams(window.location.search);
  const startParam = tg?.initDataUnsafe?.start_param || params.get("tgWebAppStartParam");

  if (startParam && startParam.startsWith("seller_")) return startParam.replace("seller_", "");
  return params.get("seller") || null;
}

function getStartChatIdFromLaunch() {
  const tg = window.Telegram?.WebApp;
  const params = new URLSearchParams(window.location.search);
  const startParam = tg?.initDataUnsafe?.start_param || params.get("tgWebAppStartParam");

  if (startParam && startParam.startsWith("chat_")) return startParam.replace("chat_", "");
  return params.get("chat") || null;
}

function safeSessionGetItem(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSetItem(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function safeSessionRemoveItem(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function safeLocalGetItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSetItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
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
  let selectedChatId = safeSessionGetItem("selected_chat_id") || null;

  let page = safeSessionGetItem("app_page") || "list";
  if (!VALID_PAGES.has(page)) page = "list";

  // Стабилизационный режим: не поднимаем раздел чатов из sessionStorage при старте.
  // Чаты открываются только по явному нажатию пользователя или через start_param=chat_*.
  if (page === "chats") {
    page = "list";
    selectedChatId = null;
  }

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

function getInitialUser() {
  const stored = getStoredAuthSession();
  return stored?.user || getTelegramUnsafeUser() || null;
}

function withTimeout(promise, timeoutMs, fallbackValue = null) {
  let timerId;
  const timeout = new Promise((resolve) => {
    timerId = window.setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  return Promise.race([promise, timeout])
    .catch(() => fallbackValue)
    .finally(() => window.clearTimeout(timerId));
}

function runBackgroundTask(task, label = "background_task", delayMs = 0) {
  const run = () => Promise.resolve()
    .then(() => {
      logDebugEvent(`${label}_start`);
      return task();
    })
    .then(() => logDebugEvent(`${label}_success`))
    .catch((error) => {
      console.warn("Фоновая задача не выполнена:", label, error);
      logDebugEvent(`${label}_error`, error);
    });

  const schedule = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 2200 });
    } else {
      window.setTimeout(run, 0);
    }
  };

  if (delayMs > 0) {
    window.setTimeout(schedule, delayMs);
  } else {
    schedule();
  }
}

function getUserUnreadTotal(chats, userId) {
  if (!userId || !Array.isArray(chats)) return 0;
  const normalizedUserId = String(userId);

  return chats.reduce((total, chat) => {
    if (String(chat?.buyerId) === normalizedUserId) return total + Number(chat.unreadByBuyer || 0);
    if (String(chat?.sellerId) === normalizedUserId) return total + Number(chat.unreadBySeller || 0);
    return total;
  }, 0);
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
  const [tgUser, setTgUser] = useState(getInitialUser);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootProgress, setBootProgress] = useState(12);
  const [bootSubtitle, setBootSubtitle] = useState("Открываем приложение…");
  const [profileCache, setProfileCache] = useState(null);
  const [theme, setTheme] = useState(() => safeLocalGetItem("theme") || "dark");
  const [unreadChatsTotal, setUnreadChatsTotal] = useState(0);

  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error("Global UI error:", event.error || event.message);
      logDebugEvent("app_window_error", { message: event.message, error: event.error });
    };
    const handleUnhandledRejection = (event) => {
      console.error("Unhandled async error:", event.reason);
      logDebugEvent("app_unhandled_rejection", { reason: event.reason });
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    safeSessionSetItem("app_page", page);
    logDebugEvent("route_change", { page });
  }, [page]);

  useEffect(() => {
    if (selectedSellerId) safeSessionSetItem("selected_seller_id", String(selectedSellerId));
    else safeSessionRemoveItem("selected_seller_id");
  }, [selectedSellerId]);

  useEffect(() => {
    if (profileStatusPage) safeSessionSetItem("profile_status_page", profileStatusPage);
    else safeSessionRemoveItem("profile_status_page");
  }, [profileStatusPage]);

  useEffect(() => {
    if (selectedChatId) safeSessionSetItem("selected_chat_id", selectedChatId);
    else safeSessionRemoveItem("selected_chat_id");
  }, [selectedChatId]);

  useEffect(() => {
    if (selectedAd) safeSessionSetItem("selected_ad", JSON.stringify(selectedAd));
    else safeSessionRemoveItem("selected_ad");
  }, [selectedAd]);

  useEffect(() => {
    if (sellerBackTarget) safeSessionSetItem("seller_back_target", sellerBackTarget);
    else safeSessionRemoveItem("seller_back_target");
  }, [sellerBackTarget]);

  useEffect(() => {
    if (viewBackTarget) safeSessionSetItem("view_back_target", viewBackTarget);
    else safeSessionRemoveItem("view_back_target");
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
  }, [page, selectedAd, viewLoading]);

  useEffect(() => {
    let cancelled = false;

    if (!tgUser?.id) {
      setUnreadChatsTotal(0);
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => {
      runBackgroundTask(async () => {
        const items = await withTimeout(getUserChatsOnce(tgUser.id, 80), 6500, []);
        if (!cancelled && Array.isArray(items)) {
          setUnreadChatsTotal(getUserUnreadTotal(items, tgUser.id));
        }
      }, "unread_badge_once");
    }, 1600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tgUser?.id]);

  useEffect(() => {
    let cancelled = false;

    const safeSetProgress = (value, text) => {
      if (cancelled) return;
      setBootProgress(value);
      if (text) setBootSubtitle(text);
    };

    const resolveAuth = async () => {
      const initData = getTelegramInitData();
      let user = null;

      try {
        if (initData) {
          safeSetProgress(34, "Проверяем Telegram-вход…");
          logDebugEvent("auth_miniapp_start");
          const auth = await withTimeout(authenticateMiniAppInitData(initData), 8500, null);
          user = auth?.user || null;
          logDebugEvent("auth_miniapp_done", { ok: !!user });
        } else {
          const stored = getStoredAuthSession();
          if (stored?.user && !cancelled) setTgUser(stored.user);

          safeSetProgress(34, "Проверяем сессию…");
          logDebugEvent("auth_restore_start", { hasStoredUser: !!stored?.user });
          const session = await withTimeout(restoreAuthSession(), 6500, null);
          user = session?.user || stored?.user || null;
          logDebugEvent("auth_restore_done", { ok: !!user });
        }
      } catch (error) {
        console.warn("Авторизация недоступна, открываем приложение без блокировки:", error);
        logDebugEvent("auth_error_non_blocking", error);
      }

      if (!user) user = getTelegramUnsafeUser();
      if (user && !cancelled) setTgUser(user);

      if (user?.id) {
        runBackgroundTask(async () => {
          const bundle = await withTimeout(getUserProfileBundle(user), 14000, null);
          if (!cancelled && bundle) setProfileCache(bundle);
        }, "profile_bundle_deferred", 2600);
      }

      return user;
    };

    const boot = async () => {
      logDebugEvent("boot_start");
      initTelegram();

      try {
        const tg = window.Telegram?.WebApp;
        tg?.ready?.();
        tg?.expand?.();
      } catch {
        // Telegram API может быть недоступен на сайте/PWA.
      }

      if (window.location.pathname === "/debug") {
        safeSetProgress(100, "Открываем диагностику…");
        setBootLoading(false);
        return;
      }

      if (window.location.pathname === "/auth/callback") {
        safeSetProgress(100, "Завершаем Telegram-вход…");
        setBootLoading(false);
        return;
      }

      safeSetProgress(22, "Открываем приложение…");
      await resolveAuth();

      if (cancelled) return;

      const startSellerId = getStartSellerIdFromLaunch();
      const startChatId = getStartChatIdFromLaunch();
      const startAdId = getStartAdIdFromLaunch();

      if (startSellerId) {
        setSelectedSellerId(String(startSellerId));
        setSellerBackTarget("list");
        setPage("seller");
        safeSetProgress(100, "Готово");
        setBootLoading(false);
        return;
      }

      if (startChatId) {
        setSelectedChatId(String(startChatId));
        setPage("chats");
        safeSetProgress(100, "Готово");
        setBootLoading(false);
        return;
      }

      if (startAdId) {
        safeSetProgress(60, "Открываем объявление…");
        const ad = await withTimeout(getAdById(startAdId), 6200, null);

        if (!cancelled && ad) {
          setSelectedAd(ad);
          setViewBackTarget("list");
          setPage("view");
        }
      }

      safeSetProgress(100, "Готово");
      logDebugEvent("boot_success", { page: safeSessionGetItem("app_page") || page });
      window.setTimeout(() => {
        if (!cancelled) setBootLoading(false);
      }, 120);
    };

    boot().catch((error) => {
      console.error("Ошибка стартовой загрузки:", error);
      logDebugEvent("boot_error", error);
      if (!cancelled) setBootLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthSuccess = (user, profile = null) => {
    setTgUser(user || null);
    setProfileCache(profile || null);
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

    if (nextPage !== "chats") setSelectedChatId(null);
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

  const unreadBadgeText = useMemo(() => {
    if (!unreadChatsTotal) return "";
    return unreadChatsTotal > 99 ? "99+" : String(unreadChatsTotal);
  }, [unreadChatsTotal]);

  if (window.location.pathname === "/debug") {
    return <DebugPage onBack={() => { window.history.replaceState({}, "", "/"); setPage("list"); setBootLoading(false); }} />;
  }

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
          <LoginPage returnPage="add" onBack={() => goToPage("list")} />
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
          <LoginPage returnPage="profile" onBack={() => goToPage("list")} />
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
          <LoginPage returnPage="chats" onBack={() => goToPage("list")} />
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

      {page === "legal" && <LegalPage type={legalType} onBack={() => goToPage("settings")} />}

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

      {page === "view" && !viewLoading && !selectedAd && (
        <LoadingScreen progress={100} subtitle="Восстанавливаем витрину…" />
      )}

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
            <span className="nav-icon nav-icon-with-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 6.8C5 5.25 6.25 4 7.8 4H16.2C17.75 4 19 5.25 19 6.8V12.2C19 13.75 17.75 15 16.2 15H11L7 18.5V15H7.8C6.25 15 5 13.75 5 12.2V6.8Z" />
                <path d="M8.5 8.5H15.5" />
                <path d="M8.5 11.2H13.5" />
              </svg>
              {!!unreadBadgeText && <span className="nav-unread-badge">{unreadBadgeText}</span>}
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
