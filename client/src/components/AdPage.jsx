import { useEffect, useRef, useState } from "react";
import {
  incrementAdViewsForUser,
  getSellerActiveAdsCount,
  getUserProfile,
} from "../firebase";

export default function AdPage({ ad, onBack, onOpenSeller, currentUser }) {
  const [modalImage, setModalImage] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerAdsCount, setSellerAdsCount] = useState(0);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setCurrentImage(0);

    if (ad?.id && currentUser?.id) {
      incrementAdViewsForUser(ad.id, currentUser.id).catch(console.error);
    }

    loadSellerInfo();
  }, [ad, currentUser?.id]);

  const loadSellerInfo = async () => {
    if (!ad?.userId) {
      setSellerProfile(null);
      setSellerAdsCount(0);
      return;
    }

    try {
      const [profile, count] = await Promise.all([
        getUserProfile(ad.userId),
        getSellerActiveAdsCount(ad.userId),
      ]);

      setSellerProfile(profile);
      setSellerAdsCount(count);
    } catch (error) {
      console.error("Ошибка загрузки продавца:", error);
    }
  };

  if (!ad) return null;

  const gallery =
    ad.imageUrls?.length
      ? ad.imageUrls
      : ad.imageUrl
      ? [ad.imageUrl]
      : [];

  const openModal = (index) => {
    setCurrentImage(index);
    setModalImage(gallery[index]);
  };

  const prevImage = () => {
    if (currentImage > 0) {
      const nextIndex = currentImage - 1;
      setCurrentImage(nextIndex);
      setModalImage(gallery[nextIndex]);
    }
  };

  const nextImage = () => {
    if (currentImage < gallery.length - 1) {
      const nextIndex = currentImage + 1;
      setCurrentImage(nextIndex);
      setModalImage(gallery[nextIndex]);
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const delta = touchStartX.current - touchEndX.current;

    if (Math.abs(delta) < 40) return;

    if (delta > 0) {
      nextImage();
    } else {
      prevImage();
    }
  };

  const sellerName =
    sellerProfile?.displayName ||
    ad.sellerDisplayName ||
    ad.firstName ||
    "Продавец";

  const sellerAvatar =
    sellerProfile?.avatarUrl ||
    sellerProfile?.telegramAvatarUrl ||
    ad.sellerAvatarUrl ||
    "";

  const isSellerVerified = !!sellerProfile?.isVerified;

  return (
    <div className="page-enter ad-page-wrap">
      <button className="back-btn premium-back-btn" onClick={onBack}>
        <span className="back-btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M14.5 6.5L9 12l5.5 5.5" />
          </svg>
        </span>
      </button>

      <div className="ad-page-shell">
        {gallery.length > 0 && (
          <div className="ad-hero-wrap clean-ad-hero-wrap" onClick={() => openModal(currentImage)}>
            <img
              className="clean-ad-hero-image"
              src={gallery[currentImage]}
              alt={ad.title}
            />

            {gallery.length > 1 && (
              <div className="gallery-counter">
                {currentImage + 1} из {gallery.length}
              </div>
            )}
          </div>
        )}

        {gallery.length > 1 && (
          <div className="thumb-row">
            {gallery.map((img, index) => (
              <button
                key={index}
                className={`thumb-btn ${currentImage === index ? "active" : ""}`}
                onClick={() => setCurrentImage(index)}
              >
                <img src={img} alt={`thumb-${index}`} />
              </button>
            ))}
          </div>
        )}

        <div className="ad-content">
          <div className="ad-meta-top">
            Объявление | Просмотры: {ad.views || 0}
          </div>

          <h1 className="ad-title">{ad.title}</h1>

          <div className="ad-price">{ad.price} ₽</div>

          <div className="ad-info-card">
            <div className="ad-info-label">Описание</div>
            <p className="ad-description">{ad.description}</p>
          </div>

          <div
            className="ad-info-card"
            onClick={() => {
              if (ad.userId && onOpenSeller) {
                onOpenSeller(ad.userId);
              }
            }}
            style={{
              cursor: ad.userId ? "pointer" : "default",
            }}
          >
            <div className="ad-info-label">Продавец</div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  flexShrink: 0,
                }}
              >
                {sellerAvatar ? (
                  <img
                    src={sellerAvatar}
                    alt="seller"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div className="avatar-placeholder" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8.2" r="3.2" />
                      <path d="M5.5 18.2C6.8 15.5 9.1 14.2 12 14.2C14.9 14.2 17.2 15.5 18.5 18.2" />
                    </svg>
                  </div>
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    lineHeight: 1.2,
                  }}
                >
                  {sellerName}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "var(--muted)",
                    fontSize: 13,
                    lineHeight: 1.35,
                  }}
                >
                  Активных объявлений: {sellerAdsCount}
                </div>

                <div style={{ marginTop: 8 }}>
                  {isSellerVerified ? (
                    <span className="mini-verified-pill">Подтвержден</span>
                  ) : (
                    <span className="mini-unverified-pill">Не подтвержден</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(ad.username || ad.userId) && (
            <button
              className="contact-btn"
              onClick={() => {
                const tg = window.Telegram?.WebApp;

                if (ad.username) {
                  const url = `https://t.me/${ad.username}`;
                  if (tg) {
                    tg.openTelegramLink(url);
                  } else {
                    window.open(url, "_blank");
                  }
                  return;
                }

                if (ad.userId) {
                  alert(
                    "У этого пользователя нет username. Следующим шагом сделаем связь через бота."
                  );
                }
              }}
            >
              Написать
            </button>
          )}
        </div>
      </div>

      {modalImage && (
        <div className="modal" onClick={() => setModalImage(null)}>
          <button
            className="modal-close"
            onClick={(e) => {
              e.stopPropagation();
              setModalImage(null);
            }}
          >
            Закрыть
          </button>

          {gallery.length > 1 && (
            <div className="gallery-counter">
              {currentImage + 1} из {gallery.length}
            </div>
          )}

          <img
            src={modalImage}
            alt="preview"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      )}
    </div>
  );
}