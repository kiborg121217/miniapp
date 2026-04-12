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

    setAds(approved);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Объявления</h2>
        {ads.map(ad => (
      <div className="grid"
        key={ad.id} 
        onClick={() => onOpen(ad)}
        style={{
          border: "1px solid #333",
          padding: 10,
          marginBottom: 10,
          borderRadius: 10,
          cursor: "pointer"
        }}>
            {ad.imageUrl && (
            <img
                src={ad.imageUrl}
                style={{
                width: "100%",
                borderRadius: 10,
                marginBottom: 10
                }}
            />
            )}

            <h3>{ad.title}</h3>
            <p>{ad.price} ₽</p>
        </div>
        ))}
    </div>
  );
}