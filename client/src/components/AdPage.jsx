import { useState } from "react";

export default function AdPage({ ad, onBack }) {
  const [modalImage, setModalImage] = useState(null);

  if (!ad) return null;

  return (
    <div className="page-enter ad-page-wrap" style={{ padding: "78px 18px 120px", maxWidth: 760, margin: "0 auto" }}>
      <button className="back-btn premium-back-btn" onClick={onBack}>
        <span className="back-btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M14.5 6.5L9 12l5.5 5.5" />
          </svg>
        </span>
      </button>

      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          alt={ad.title}
          onClick={() => setModalImage(ad.imageUrl)}
          style={{
            width: "100%",
            height: "320px",
            objectFit: "cover",
            borderRadius: "22px",
            cursor: "pointer",
            display: "block",
            boxShadow: "0 16px 34px rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
      )}

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          Объявление
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 30,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            fontWeight: 750,
          }}
        >
          {ad.title}
        </h2>

        <div
          style={{
            marginTop: 10,
            fontSize: 28,
            fontWeight: 750,
            color: "#8eb0ff",
            letterSpacing: "-0.03em",
          }}
        >
          {ad.price} ₽
        </div>

        <div
          style={{
            marginTop: 22,
            padding: "16px 16px 18px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.48)",
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Описание
          </div>

          <p
            style={{
              margin: 0,
              wordBreak: "break-word",
              lineHeight: 1.55,
              fontSize: 15,
              color: "rgba(255,255,255,0.88)",
            }}
          >
            {ad.description}
          </p>
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
                const url = `tg://user?id=${ad.userId}`;
                if (tg) {
                  window.location.href = url;
                } else {
                  window.open(url, "_blank");
                }
              }
            }}
          >
            Написать
          </button>
        )}
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

          <img
            src={modalImage}
            alt="preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}