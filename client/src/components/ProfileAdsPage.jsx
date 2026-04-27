import { useEffect, useState } from "react";
import { getUserAds, getUserFavoriteAds, archiveAd, restoreAd } from "../firebase";
import PageBackButton from "./PageBackButton";

const TITLES = {
  approved: "Активные объявления",
  pending: "На модерации",
  archived: "Архив",
  rejected: "Отклонённые",
  favorites: "Избранное",
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

function isActiveUntil(value) {
  return typeof value === "number" && value > Date.now();
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

export default function ProfileAdsPage({ user, status, onOpenAd, onBack }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPromoteSheet, setShowPromoteSheet] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [promoteMessage, setPromoteMessage] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    loadAds();
  }, [user?.id, status]);

  const loadAds = async () => {
    if (!user?.id) {
      setAds([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data =
        status === "favorites"
          ? await getUserFavoriteAds(user.id)
          : await getUserAds(user.id, status);

      setAds(Array.isArray(data) ? data : []);
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

  return (
    <div className="help-page page-enter">
      <PageBackButton onClick={onBack} />

      <div className="help-hero">
        <div className="help-badge">Профиль</div>
        <h2>{TITLES[status] || "Объявления"}</h2>
        <p>{status === "favorites" ? "Здесь собраны объявления, которые ты добавил в избранное." : "Здесь собраны объявления выбранной категории."}</p>
      </div>

      <div className="help-card profile-ads-list-card">
        {loading ? (
          <div className="profile-ads-loading-state">
            <div className="profile-ads-loading-spinner" aria-hidden="true" />
            <p>{status === "favorites" ? "Загружаем избранные объявления…" : "Загружаем объявления…"}</p>
          </div>
        ) : ads.length === 0 ? (
          <p>{status === "favorites" ? "В избранном пока ничего нет." : "В этой категории пока ничего нет."}</p>
        ) : (
          ads.map((ad) => (
            <div key={ad.id} className="profile-ad-row">
              <div className="profile-ad-main" onClick={() => onOpenAd(ad)}>
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.title} className="profile-ad-thumb" />
                ) : null}

                <div className="profile-ad-text">
                  <div className="profile-ad-title">{ad.title}</div>
                  <div className="profile-ad-meta">
                    {ad.price} ₽ · просмотров: {ad.views || 0}
                  </div>
                  <PromoteState ad={ad} />
                </div>
              </div>

              <div className="profile-ad-actions">
                <button className="soft-action-btn" onClick={() => onOpenAd(ad)}>
                  Открыть
                </button>

                {status === "approved" && (
                  <>
                    <button className="soft-premium-btn" onClick={() => openPromote(ad)}>
                      Продвинуть
                    </button>
                    <button className="soft-danger-btn" onClick={() => handleArchive(ad.id)}>
                      Снять
                    </button>
                  </>
                )}

                {status === "archived" && (
                  <button className="soft-action-btn" onClick={() => handleRestore(ad.id)}>
                    Вернуть
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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