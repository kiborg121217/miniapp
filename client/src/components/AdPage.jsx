import { useEffect, useRef, useState } from "react";
import {
  incrementAdViewsForUser,
  getSellerActiveAdsCount,
  getUserProfile,
} from "../firebase";

const BOT_USERNAME = "baraholka_miniapp_bot";

function buildAdShareLink(adId) {
  if (BOT_USERNAME) {
    return `https://t.me/${BOT_USERNAME}?startapp=ad_${adId}`;
  }

  return `${window.location.origin}/?ad=${adId}`;
}

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

  const handleShare = async () => {
    if (!ad?.id) return;

    const shareUrl = buildAdShareLink(ad.id);
    const shareText = `Посмотри объявление: ${ad.title}`;
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
          title: ad.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert("Ссылка на объявление скопирована");
    } catch (error) {
      console.error("Ошибка шаринга:", error);
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Ссылка на объявление скопирована");
      } catch {
        window.open(telegramShareUrl, "_blank");
      }
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
          <svg viewBox="0 0 612 612" aria-hidden="true" focusable="false">
            <path d="M497.25 497.25c0 21.114-17.117 38.25-38.25 38.25H76.5c-21.133 0-38.25-17.136-38.25-38.25v-382.5c0-21.133 17.117-38.25 38.25-38.25H459c21.133 0 38.25 17.117 38.25 38.25v57.375h38.25V114.75c0-42.247-34.253-76.5-76.5-76.5H76.5C34.253 38.25 0 72.503 0 114.75v382.5c0 42.247 34.253 76.5 76.5 76.5H459c42.247 0 76.5-34.253 76.5-76.5v-57.375h-38.25v57.375zM592.875 286.875H180.043l100.272-100.272c7.478-7.458 7.478-19.584 0-27.042-7.478-7.478-19.584-7.478-27.042 0L121.329 291.522c-3.997 3.978-5.699 9.256-5.432 14.478-.268 5.221 1.435 10.5 5.413 14.478l131.943 131.943c7.458 7.478 19.584 7.478 27.042 0 7.478-7.459 7.478-19.584 0-27.043L180.043 325.125h412.832c10.557 0 19.125-8.568 19.125-19.125 0-10.557-8.568-19.125-19.125-19.125z" />
          </svg>
        </span>
      </button>

      <button
        className="share-top-btn premium-share-btn"
        onClick={handleShare}
        aria-label="Поделиться объявлением"
        title="Поделиться"
      >
        <span className="back-btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M14 5L19 10L14 15" />
            <path d="M19 10H10.5C7.5 10 5 12.5 5 15.5V19" />
          </svg>
        </span>
      </button>

      <div className="ad-page-shell">
        {gallery.length > 0 && (
          <div
            className="ad-hero-wrap clean-ad-hero-wrap"
            onClick={() => openModal(currentImage)}
          >
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
            Объявление | {ad.category || "Без категории"} | Просмотры: {ad.views || 0}
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