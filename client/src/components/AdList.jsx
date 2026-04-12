import { useEffect, useState } from "react";
import { getAds } from "../firebase";

export default function AdList({ onOpen }) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    loadAds();
  }, []);
  
  const [loading, setLoading] = useState(true);

  const loadAds = async () => {
    const data = await getAds();
    const approved = data.filter(ad => ad.status === "approved");

    setAds(approved);
    setLoading(false);
  };

  if (loading) {
  return (
    <div style={{ padding: "10px 10px 120px" }}>
      <div className="header">
        <h2>Объявления</h2>
      </div>

      <div className="grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-card"></div>
        ))}
      </div>
    </div>
  );
}

return (
  <div style={{ padding: "10px 10px 120px" }}>
    <div className="header">
      <h2>Объявления</h2>
    </div>

    <div className="grid">
      {ads.map(ad => (
        <div
          className="card"
          key={ad.id}
          onClick={() => onOpen(ad)}
        >
          {ad.imageUrl && (
            <img src={ad.imageUrl} />
          )}

          <h3>{ad.title}</h3>
          <p>{ad.price} ₽</p>
        </div>
      ))}
    </div>
  </div>
);
}