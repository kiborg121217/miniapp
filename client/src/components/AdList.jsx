import { useEffect, useState } from "react";
import { getAds } from "../firebase";

export default function AdList({ onOpen }) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    const data = await getAds();

    // показываем только одобренные
    const approved = data.filter(ad => ad.status === "approved");

    setAds(approved.sort((a, b) => b.createdAt - a.createdAt));
  };

return (
  <div style={{ padding: 20 }}>
    <h2>Объявления</h2>

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