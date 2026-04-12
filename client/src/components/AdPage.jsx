import { useState } from "react";

export default function AdPage({ ad, onBack }) {
  const [modalImage, setModalImage] = useState(null);
  if (!ad) return null;

    const contactLink = ad.username
    ? `https://t.me/${ad.username}`
    : ad.userId
    ? `https://t.me/user?id=${ad.userId}`
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

      <p>{ad.description}</p>

        {contactLink && (
        <a href={contactLink} target="_blank">
          <button className="contact-btn">Написать</button>
        </a>
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
              ✕
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