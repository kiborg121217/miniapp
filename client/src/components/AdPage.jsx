export default function AdPage({ ad, onBack }) {
  if (!ad) return null;

    const contactLink = ad.username
    ? `https://t.me/${ad.username}`
    : ad.userId
    ? `https://t.me/user?id=${ad.userId}`
    : null;

  return (
    <div style={{ padding: 20 }}>
      <button className="back-btn" onClick={onBack}>←</button>

      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          style={{ width: "100%", borderRadius: 10, marginTop: 10 }}
        />
      )}

      <h2>{ad.title}</h2>
      <h3>{ad.price} ₽</h3>

      <p>{ad.description}</p>

        {contactLink && (
        <a href={contactLink} target="_blank">
          <button className="contact-btn">Связаться</button>
        </a>
        )}
    </div>
  );
}