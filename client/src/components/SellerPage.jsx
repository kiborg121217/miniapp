import { useEffect, useState } from "react";
import {
  getSellerApprovedAds,
  getSellerActiveAdsCount,
  getSellerArchivedAdsCount,
  getUserProfile,
} from "../firebase";
import PageBackButton from "./PageBackButton";

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

  return (
    <div className="seller-premium-page page-enter">
      <PageBackButton onClick={onBack} />

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
