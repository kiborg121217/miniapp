import { useState } from "react";

export default function AdPage({ ad, onBack }) {
  const [modalImage, setModalImage] = useState(null);
  if (!ad) return null;

  const contactLink = ad.userId
    ? `tg://user?id=${ad.userId}`
    : null;

  return (
    <div style={{ padding: "70px 20px 120px" }}>
      <button className="back-btn" onClick={onBack}>←</button>

      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          onClick={() => setModalImage(ad.imageUrl)}
          style={{
            width: "100%",
            height: "300px",
            objectFit: "cover",
            borderRadius: 12,
            marginTop: 10,
            cursor: "pointer"
          }}
        />
      )}

      <h2>{ad.title}</h2>
      <h3>{ad.price} ₽</h3>

      <p style={{ wordBreak: "break-word" }}>{ad.description}</p>

      {ad.userId && (
        <button
          className="contact-btn"
          onClick={() => {
            const tg = window.Telegram?.WebApp;

            if (tg && ad.userId) {
              tg.openTelegramLink(`https://t.me/user?id=${ad.userId}`);
            } else {
              window.open(`https://t.me/user?id=${ad.userId}`, "_blank");
            }
          }}
        >
          Написать
        </button>
      )}
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
              onClick={(e) => e.stopPropagation()}
            />

          </div>
        )}
    </div>
  );
}