import { useEffect, useState } from "react";
import {
  getSellerApprovedAds,
  getSellerActiveAdsCount,
  getSellerArchivedAdsCount,
  getUserProfile,
} from "../firebase";
import PageBackButton from "./PageBackButton";

const BOT_USERNAME = "baraholka_miniapp_bot";

function buildSellerShareLink(sellerId) {
  if (BOT_USERNAME) {
    return `https://t.me/${BOT_USERNAME}?startapp=seller_${sellerId}`;
  }

  return `${window.location.origin}/?seller=${sellerId}`;
}

const formatPrice = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return `${value || 0} ₽`;
  return `${number.toLocaleString("ru-RU")} ₽`;
};

function SellerAvatar({ profile }) {
  const avatarUrl = profile?.avatarUrl || profile?.telegramAvatarUrl || "";

  if (avatarUrl) {
    return <img src={avatarUrl} alt="avatar" className="seller-premium-avatar-img" />;
  }

  return (
    <div className="seller-premium-avatar-placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8.2" r="3.2" />
        <path d="M5.5 18.2C6.8 15.5 9.1 14.2 12 14.2C14.9 14.2 17.2 15.5 18.5 18.2" />
      </svg>
    </div>
  );
}

function SellerAdImage({ ad }) {
  const image = ad.imageUrls?.[0] || ad.imageUrl || "";

  if (!image) {
    return (
      <div className="seller-premium-card-placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 14l2.2-2.2a1.3 1.3 0 0 1 1.8 0L16 16" />
          <circle cx="16.5" cy="9" r="1.4" />
        </svg>
      </div>
    );
  }

  return <img src={image} alt={ad.title} className="seller-premium-card-image" />;
}

export default function SellerPage({ sellerId, onOpenAd, onBack }) {
  const [profile, setProfile] = useState(null);
  const [ads, setAds] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    loadSeller();
  }, [sellerId]);

  const loadSeller = async () => {
    if (!sellerId) {
      setProfile(null);
      setAds([]);
      setActiveCount(0);
      setSoldCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const sellerIdString = String(sellerId);
    const sellerIdNumber = Number(sellerId);
    const sellerIdForAds = Number.isNaN(sellerIdNumber) ? sellerIdString : sellerIdNumber;

    try {
      const [p, sellerAds, sellerActiveCount, sellerArchivedCount] = await Promise.all([
        getUserProfile(sellerIdString),
        getSellerApprovedAds(sellerIdForAds),
        getSellerActiveAdsCount(sellerIdForAds),
        getSellerArchivedAdsCount(sellerIdForAds),
      ]);

      setProfile(p);
      setAds(Array.isArray(sellerAds) ? sellerAds : []);
      setActiveCount(typeof sellerActiveCount === "number" ? sellerActiveCount : 0);
      setSoldCount(typeof sellerArchivedCount === "number" ? sellerArchivedCount : 0);
    } catch (error) {
      console.error("Ошибка загрузки продавца:", error);
      setProfile(null);
      setAds([]);
      setActiveCount(0);
      setSoldCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  if (!sellerId) {
    return (
      <div className="seller-premium-page page-enter">
        <PageBackButton onClick={onBack} />
        <div className="seller-premium-empty">
          <h2>Продавец недоступен</h2>
          <p>У этого объявления пока нет привязанного профиля продавца.</p>
        </div>
      </div>
    );
  }

  const sellerName = profile?.displayName || profile?.firstName || "Продавец";
  const isVerified = !!profile?.isVerified;

  const handleShareSeller = async () => {
    if (!sellerId) return;

    const shareUrl = buildSellerShareLink(String(sellerId));
    const shareText = `Посмотри профиль продавца: ${sellerName}`;
    const telegramShareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}` +
      `&text=${encodeURIComponent(shareText)}`;

    const tg = window.Telegram?.WebApp;

    try {
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(telegramShareUrl);
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: sellerName,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert("Ссылка на профиль продавца скопирована");
    } catch (error) {
      console.error("Ошибка шаринга профиля продавца:", error);
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Ссылка на профиль продавца скопирована");
      } catch {
        window.open(telegramShareUrl, "_blank");
      }
    }
  };

  return (
    <div className="seller-premium-page page-enter">
      <PageBackButton onClick={onBack} />

      <button
        className="share-top-btn premium-share-btn seller-premium-share-btn"
        onClick={handleShareSeller}
        aria-label="Поделиться профилем продавца"
        title="Поделиться профилем"
      >
        <span className="share-btn-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" focusable="false">
            <path d="M37 4C33.1457 4 30 7.1457 30 11C30 11.7236 30.2541 12.3757 30.459 13.041L14.9824 20.4922A1.0001 1.0001 0 0 0 14.5156 21.8281C14.8286 22.4764 15 23.2128 15 24C15 26.7737 12.7737 29 10 29C7.2263 29 5 26.7737 5 24C5 21.2263 7.2263 19 10 19C10.582 19 11.1378 19.0999 11.6543 19.2813A1.0007 1.0007 0 1 0 12.3164 17.3926C11.5909 17.1379 10.81 17 10 17C6.1457 17 3 20.1457 3 24C3 27.8543 6.1457 31 10 31C13.8543 31 17 27.8543 17 24C17 23.2766 16.7459 22.6259 16.541 21.9609L32.0176 14.5098A1.0001 1.0001 0 0 0 32.4844 13.1738C32.1711 12.5242 32 11.7872 32 11C32 8.2263 34.2263 6 37 6C39.7737 6 42 8.2263 42 11C42 13.7737 39.7737 16 37 16C36.4244 16 35.875 15.9038 35.3633 15.7266A1.0001 1.0001 0 1 0 34.709 17.6152C35.4273 17.864 36.1996 18 37 18C40.8543 18 44 14.8543 44 11C44 7.1457 40.8543 4 37 4ZM18.9863 27.3457A1.0001 1.0001 0 0 0 18.6035 29.252L31.1504 35.293A1.0001 1.0001 0 0 0 32.4844 34.8262C33.2898 33.1555 35.006 32 37 32C39.7737 32 42 34.2263 42 37C42 39.7737 39.7737 42 37 42C34.825 42 32.9889 40.6202 32.2949 38.6973A1.0001 1.0001 0 1 0 30.4141 39.375C31.3881 42.0741 33.977 44 37 44C40.8543 44 44 40.8543 44 37C44 33.1457 40.8543 30 37 30C34.5932 30 32.5064 31.2553 31.2441 33.1172L19.4707 27.4492A1.0001 1.0001 0 0 0 18.9863 27.3457Z" />
          </svg>
        </span>
      </button>

      <section className="seller-premium-hero">
        <div className="seller-premium-main">
          <div className="seller-premium-avatar">
            <SellerAvatar profile={profile} />
          </div>

          <div className="seller-premium-info">
            <h1>{sellerName}</h1>

            <div className="seller-premium-rating" aria-label="Рейтинг продавца">
              <span className="seller-premium-star" aria-hidden="true">★</span>
              <span>5.0</span>
              <span className="seller-premium-dot">•</span>
              <span>0 отзывов</span>
            </div>

            {isVerified ? (
              <div className="seller-premium-verified">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 4.5-2.8 8.4-7 10c-4.2-1.6-7-5.5-7-10V6l7-3z" />
                  <path d="M8.8 12.2l2.1 2.1l4.5-4.8" />
                </svg>
                Проверенный продавец
              </div>
            ) : (
              <div className="seller-premium-unverified">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 4.5-2.8 8.4-7 10c-4.2-1.6-7-5.5-7-10V6l7-3z" />
                  <path d="M9 12h6" />
                </svg>
                Профиль не подтвержден
              </div>
            )}
          </div>
        </div>

        <div className="seller-premium-divider" />

        <div className="seller-premium-stats">
          <div className="seller-premium-stat">
            <strong>{activeCount}</strong>
            <span>Активных</span>
          </div>
          <div className="seller-premium-stat-separator" />
          <div className="seller-premium-stat">
            <strong>{soldCount}</strong>
            <span>Продано</span>
          </div>
        </div>
      </section>

      <div className="seller-premium-section-head">
        <h2>Активные товары</h2>
        <span>{activeCount} объявлений</span>
      </div>

      {isLoading ? (
        <div className="seller-premium-empty">
          <p>Загружаем объявления продавца...</p>
        </div>
      ) : ads.length === 0 ? (
        <div className="seller-premium-empty">
          <h2>Пока нет товаров</h2>
          <p>У продавца нет активных объявлений.</p>
        </div>
      ) : (
        <div className="seller-premium-grid">
          {ads.map((ad, index) => (
            <button
              type="button"
              className="seller-premium-card"
              style={{ animationDelay: `${index * 45}ms` }}
              key={ad.id}
              onClick={() => onOpenAd(ad)}
            >
              <div className="seller-premium-card-media">
                <SellerAdImage ad={ad} />
              </div>

              <div className="seller-premium-card-body">
                <div className="seller-premium-card-title">{ad.title}</div>
                <div className="seller-premium-card-price">{formatPrice(ad.price)}</div>
                <div className="seller-premium-card-location">Вологда</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
