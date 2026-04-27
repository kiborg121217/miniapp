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
        <span className="share-btn-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" focusable="false">
            <path d="M37 4C33.1457 4 30 7.1457 30 11C30 11.7236 30.2541 12.3757 30.459 13.041L14.9824 20.4922A1.0001 1.0001 0 0 0 14.5156 21.8281C14.8286 22.4764 15 23.2128 15 24C15 26.7737 12.7737 29 10 29C7.2263 29 5 26.7737 5 24C5 21.2263 7.2263 19 10 19C10.582 19 11.1378 19.0999 11.6543 19.2813A1.0007 1.0007 0 1 0 12.3164 17.3926C11.5909 17.1379 10.81 17 10 17C6.1457 17 3 20.1457 3 24C3 27.8543 6.1457 31 10 31C13.8543 31 17 27.8543 17 24C17 23.2766 16.7459 22.6259 16.541 21.9609L32.0176 14.5098A1.0001 1.0001 0 0 0 32.4844 13.1738C32.1711 12.5242 32 11.7872 32 11C32 8.2263 34.2263 6 37 6C39.7737 6 42 8.2263 42 11C42 13.7737 39.7737 16 37 16C36.4244 16 35.875 15.9038 35.3633 15.7266A1.0001 1.0001 0 1 0 34.709 17.6152C35.4273 17.864 36.1996 18 37 18C40.8543 18 44 14.8543 44 11C44 7.1457 40.8543 4 37 4ZM18.9863 27.3457A1.0001 1.0001 0 0 0 18.6035 29.252L31.1504 35.293A1.0001 1.0001 0 0 0 32.4844 34.8262C33.2898 33.1555 35.006 32 37 32C39.7737 32 42 34.2263 42 37C42 39.7737 39.7737 42 37 42C34.825 42 32.9889 40.6202 32.2949 38.6973A1.0001 1.0001 0 1 0 30.4141 39.375C31.3881 42.0741 33.977 44 37 44C40.8543 44 44 40.8543 44 37C44 33.1457 40.8543 30 37 30C34.5932 30 32.5064 31.2553 31.2441 33.1172L19.4707 27.4492A1.0001 1.0001 0 0 0 18.9863 27.3457Z" />
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