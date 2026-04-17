import { useEffect, useRef, useState } from "react";

export default function AdPage({ ad, onBack }) {
  const [modalImage, setModalImage] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setCurrentImage(0);
  }, [ad]);

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
          <div className="ad-hero-wrap">
            <img
              className="ad-hero-image"
              src={gallery[currentImage]}
              alt={ad.title}
              onClick={() => openModal(currentImage)}
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
          <div className="ad-meta-top">Объявление</div>

          <h1 className="ad-title">{ad.title}</h1>

          <div className="ad-price">{ad.price} ₽</div>

          <div className="ad-info-card">
            <div className="ad-info-label">Описание</div>
            <p className="ad-description">{ad.description}</p>
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

                // временный fallback для пользователей без username
                if (ad.userId) {
                  alert("У этого пользователя нет username. Ниже дам, как сделать надёжную связь через бота.");
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