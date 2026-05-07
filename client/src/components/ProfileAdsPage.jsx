import { useEffect, useMemo, useState } from "react";
import { getUserAds, getUserFavoriteAds, archiveAd, restoreAd } from "../firebase";
import PageBackButton from "./PageBackButton";

const PAGE_META = {
  approved: {
    title: "Активные объявления",
    subtitle: "Объявления, которые сейчас видят покупатели.",
    badge: "Профиль",
    tone: "mint",
  },
  pending: {
    title: "На модерации",
    subtitle: "Объявления, которые ждут проверки перед публикацией.",
    badge: "Проверка",
    tone: "gold",
  },
  archived: {
    title: "Архив",
    subtitle: "Снятые с публикации объявления, которые можно вернуть.",
    badge: "История",
    tone: "blue",
  },
  rejected: {
    title: "Отклонённые",
    subtitle: "Объявления, которые не прошли модерацию.",
    badge: "Модерация",
    tone: "red",
  },
  favorites: {
    title: "Избранное",
    subtitle: "Сохранённые объявления, к которым можно быстро вернуться.",
    badge: "Покупки",
    tone: "pink",
  },
};

const PROMOTE_OPTIONS = [
  {
    type: "boost",
    title: "Поднять",
    description: "Поднимет объявление выше в ленте на 24 часа",
    price: "19 ₽",
  },
  {
    type: "vip",
    title: "VIP",
    description: "Выделит карточку и добавит бейдж VIP на 3 дня",
    price: "49 ₽",
  },
  {
    type: "pin",
    title: "Закреп",
    description: "Закрепит объявление в верхней части ленты на 3 дня",
    price: "69 ₽",
  },
  {
    type: "turbo",
    title: "Турбо",
    description: "Закреп + VIP + поднятие на 3 дня",
    price: "119 ₽",
  },
];

function toTimestamp(value) {
  if (typeof value === "number") return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isActiveUntil(value) {
  return toTimestamp(value) > Date.now();
}

function getAdImage(ad) {
  if (Array.isArray(ad?.imageUrls) && ad.imageUrls.length > 0) return ad.imageUrls[0];
  return ad?.imageUrl || "";
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `${value || 0} ₽`;
  return `${number.toLocaleString("ru-RU")} ₽`;
}

function PageIcon({ status }) {
  if (status === "favorites") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 20.5C9.3 18.1 5.2 14.9 4.1 11.8C3.1 9 4.6 6.4 7.3 6.1C9 5.9 10.4 6.7 11.2 8C11.5 8.4 12.1 8.4 12.4 8C13.3 6.7 14.8 5.9 16.4 6.1C19.1 6.4 20.6 9 19.6 11.8C18.5 14.9 14.7 18.1 12 20.5Z" />
      </svg>
    );
  }

  if (status === "pending") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" />
        <path d="M12 8.4V12.3L14.8 14" />
      </svg>
    );
  }

  if (status === "archived") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.2 8.5H18.8V18.3C18.8 19.2 18.1 19.9 17.2 19.9H6.8C5.9 19.9 5.2 19.2 5.2 18.3V8.5Z" />
        <path d="M4.4 5.2H19.6V8.5H4.4V5.2Z" />
        <path d="M9.2 12.2H14.8" />
      </svg>
    );
  }

  if (status === "rejected") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.7L20.1 18.2C20.6 19.1 20 20.2 19 20.2H5C4 20.2 3.4 19.1 3.9 18.2L12 3.7Z" />
        <path d="M12 8.8V13.1" />
        <path d="M12 16.8H12.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="15" rx="3.6" />
      <path d="M8.4 9.3H15.6" />
      <path d="M8.4 12.6H15.6" />
      <path d="M8.4 15.9H13.4" />
    </svg>
  );
}

function EmptyIcon({ status }) {
  return (
    <div className={`profile-ads-empty-icon profile-ads-empty-${status || "approved"}`}>
      <PageIcon status={status} />
    </div>
  );
}

function PromoteState({ ad }) {
  const pinned = !!ad.isPinned && isActiveUntil(ad.pinnedUntil);
  const vip = !!ad.isVip && isActiveUntil(ad.vipUntil);
  const boosted = isActiveUntil(ad.boostUntil);

  if (!pinned && !vip && !boosted) return null;

  return (
    <div className="profile-promo-badges">
      {pinned && <span className="promo-badge promo-badge-pin">Закреплено</span>}
      {vip && <span className="promo-badge promo-badge-vip">VIP</span>}
      {!vip && boosted && <span className="promo-badge promo-badge-boost">Поднято</span>}
      {pinned && vip && boosted && (
        <span className="promo-badge promo-badge-turbo">TURBO</span>
      )}
    </div>
  );
}

const PROFILE_ADS_CACHE_PREFIX = "baraholka_profile_ads_v1";
const PROFILE_BUNDLE_CACHE_PREFIX = "baraholka_profile_bundle_v1";

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

function getCachedAdsForStatus(userId, status) {
  if (!userId) return [];
  const direct = readJsonCache(`${PROFILE_ADS_CACHE_PREFIX}_${userId}_${status}`);
  if (Array.isArray(direct?.ads)) return direct.ads;

  const bundle = readJsonCache(`${PROFILE_BUNDLE_CACHE_PREFIX}_${userId}`);
  const map = {
    approved: "activeAds",
    archived: "archivedAds",
    pending: "pendingAds",
    rejected: "rejectedAds",
    favorites: "favoriteAds",
  };
  const key = map[status] || map.approved;

  return Array.isArray(bundle?.[key]) ? bundle[key] : [];
}

function setCachedAdsForStatus(userId, status, ads) {
  if (!userId) return;
  writeJsonCache(`${PROFILE_ADS_CACHE_PREFIX}_${userId}_${status}`, {
    ads: Array.isArray(ads) ? ads : [],
    cachedAt: Date.now(),
  });
}

export default function ProfileAdsPage({ user, status, onOpenAd, onEditAd, onBack }) {
  const [ads, setAds] = useState(() => getCachedAdsForStatus(user?.id, status));
  const [loading, setLoading] = useState(true);
  const [showPromoteSheet, setShowPromoteSheet] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [promoteMessage, setPromoteMessage] = useState("");

  const meta = useMemo(() => PAGE_META[status] || PAGE_META.approved, [status]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, status]);

  const loadAds = async () => {
    if (!user?.id) {
      setAds([]);
      setLoading(false);
      return;
    }

    const cached = getCachedAdsForStatus(user.id, status);
    if (cached.length > 0) {
      setAds(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data =
        status === "favorites"
          ? await getUserFavoriteAds(user.id, 80)
          : await getUserAds(user.id, status);

      const nextAds = Array.isArray(data) ? data : [];
      setAds(nextAds);
      setCachedAdsForStatus(user.id, status, nextAds);
    } catch (error) {
      console.error("Ошибка загрузки объявлений профиля:", error);
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (adId) => {
    await archiveAd(adId);
    await loadAds();
  };

  const handleRestore = async (adId) => {
    await restoreAd(adId);
    await loadAds();
  };

  const handleEditAd = (ad, editMode = "edit-active") => {
    if (!ad?.id) return;
    onEditAd?.(ad, editMode);
  };

  const getRejectReason = (ad) => (
    ad?.rejectionReason ||
    ad?.moderationRejectReason ||
    ad?.rejectReason ||
    ad?.moderationComment ||
    "Исправь объявление и отправь его на повторную проверку."
  );

  const openPromote = (ad) => {
    setSelectedAd(ad);
    setPromoteMessage("");
    setShowPromoteSheet(true);
  };

  const handlePromote = async (type) => {
    if (!selectedAd?.id || !user?.id) return;

    try {
      setPromoteMessage("Применяем продвижение...");

      const response = await fetch("https://miniapp-1wzi.onrender.com/promote-ad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adId: selectedAd.id,
          userId: user.id,
          type,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Не удалось применить продвижение");
      }

      setPromoteMessage("✅ Продвижение применено");
      await loadAds();

      setTimeout(() => {
        setShowPromoteSheet(false);
        setSelectedAd(null);
        setPromoteMessage("");
      }, 700);
    } catch (error) {
      console.error(error);
      setPromoteMessage("❌ Ошибка продвижения");
    }
  };

  const emptyText = status === "favorites"
    ? "Сохраняй понравившиеся объявления сердечком — они появятся здесь."
    : "В этой категории пока ничего нет.";

  return (
    <div className={`profile-ads-premium-page profile-ads-status-${status || "approved"} page-enter`}>
      <PageBackButton onClick={onBack} />

      <section className={`profile-ads-premium-hero profile-ads-tone-${meta.tone}`}>
        <div className="profile-ads-hero-icon">
          <PageIcon status={status} />
        </div>

        <div className="profile-ads-hero-text">
          <div className="profile-ads-hero-badge">{meta.badge}</div>
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
        </div>

        <div className="profile-ads-count-pill">
          <span>{loading ? "…" : ads.length}</span>
          <small>{ads.length === 1 ? "объявление" : "объявлений"}</small>
        </div>
      </section>

      <section className="profile-ads-premium-panel">
        {loading ? (
          <div className="profile-ads-loading-state profile-ads-premium-loading">
            <div className="profile-ads-loading-spinner" aria-hidden="true" />
            <p>{status === "favorites" ? "Загружаем избранные объявления…" : "Загружаем объявления…"}</p>
          </div>
        ) : ads.length === 0 ? (
          <div className="profile-ads-empty-state">
            <EmptyIcon status={status} />
            <h2>{status === "favorites" ? "Избранных пока нет" : "Пока пусто"}</h2>
            <p>{emptyText}</p>
          </div>
        ) : (
          <div className="profile-ads-premium-grid">
            {ads.map((ad) => (
              <article key={ad.id} className="profile-ad-premium-card">
                <button type="button" className="profile-ad-premium-main" onClick={() => onOpenAd(ad)}>
                  <div className="profile-ad-premium-image-wrap">
                    {getAdImage(ad) ? (
                      <img src={getAdImage(ad)} alt={ad.title} className="profile-ad-premium-image" />
                    ) : (
                      <div className="profile-ad-premium-placeholder">
                        <PageIcon status={status} />
                      </div>
                    )}
                  </div>

                  <div className="profile-ad-premium-body">
                    <div className="profile-ad-premium-title">{ad.title}</div>
                    <div className="profile-ad-premium-price">{formatPrice(ad.price)}</div>
                    <div className="profile-ad-premium-meta">
                      <span>{ad.city || "Вологда"}</span>
                      <span>Просмотры: {ad.views || 0}</span>
                    </div>
                    <PromoteState ad={ad} />
                    {status === "rejected" && (
                      <div className="profile-ad-reject-reason">
                        <span>Причина:</span> {getRejectReason(ad)}
                      </div>
                    )}
                  </div>
                </button>

                <div className="profile-ad-actions profile-ad-premium-actions">
                  <button className="soft-action-btn" onClick={() => onOpenAd(ad)}>
                    Открыть
                  </button>

                  {status === "approved" && (
                    <>
                      <button className="soft-action-btn profile-ad-edit-btn" onClick={() => handleEditAd(ad, "edit-active")}>
                        Редактировать
                      </button>
                      <button className="soft-premium-btn" onClick={() => openPromote(ad)}>
                        Продвинуть
                      </button>
                      <button className="soft-danger-btn" onClick={() => handleArchive(ad.id)}>
                        Снять
                      </button>
                    </>
                  )}

                  {status === "rejected" && (
                    <button className="soft-premium-btn profile-ad-fix-btn" onClick={() => handleEditAd(ad, "fix-rejected")}>
                      Исправить
                    </button>
                  )}

                  {status === "archived" && (
                    <button className="soft-action-btn" onClick={() => handleRestore(ad.id)}>
                      Вернуть
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showPromoteSheet && selectedAd && (
        <div className="ios-sheet-backdrop" onClick={() => setShowPromoteSheet(false)}>
          <div className="ios-sheet-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-card premium-promote-sheet">
              <div className="ios-sheet-header">
                <div className="ios-sheet-title">Продвижение объявления</div>
                <div className="ios-sheet-subtitle">{selectedAd.title}</div>
              </div>

              <div className="promote-cards">
                {PROMOTE_OPTIONS.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className="promote-option-card"
                    onClick={() => handlePromote(item.type)}
                  >
                    <div className="promote-option-top">
                      <span className="promote-option-title">{item.title}</span>
                      <span className="promote-option-price">{item.price}</span>
                    </div>
                    <div className="promote-option-desc">{item.description}</div>
                  </button>
                ))}
              </div>

              {!!promoteMessage && (
                <div className="promote-message">{promoteMessage}</div>
              )}
            </div>

            <button
              type="button"
              className="ios-sheet-cancel"
              onClick={() => setShowPromoteSheet(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
