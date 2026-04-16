import { useEffect, useRef, useState } from "react";
import { getAds } from "../firebase";

export default function AdList({ onOpen }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    loadAds();

    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY > lastY.current && currentY > 40) {
        setHeaderHidden(true);
      } else {
        setHeaderHidden(false);
      }

      lastY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const loadAds = async () => {
    const data = await getAds();
    const approved = data.filter((ad) => ad.status === "approved");
    setAds(approved.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: "92px 10px 120px" }}>
        <div
          className={`header ${headerHidden ? "header-hidden" : ""}`}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="header-kicker">Барахолка | Вологда</div>
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
    <div style={{ padding: "92px 10px 120px" }}>
      <div
        className={`header ${headerHidden ? "header-hidden" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <div className="header-kicker">Барахолка | Вологда</div>
        <h2>Объявления</h2>
      </div>

      {ads.length === 0 ? (
        <div className="empty-state page-enter">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="5" y="4.5" width="14" height="15" rx="3.5" />
              <path d="M8.5 9.5H15.5" />
              <path d="M8.5 13H15.5" />
              <path d="M10 7.25H14" />
            </svg>
          </div>
          <h3>Пока объявлений нет</h3>
          <p>
            Будь первым, кто разместит товар. Нажми <strong>«Создать»</strong> в
            нижнем меню и оформи своё объявление.
          </p>
        </div>
      ) : (
        <div className="grid">
          {ads.map((ad, index) => (
            <div
              className="card card-appear"
              style={{ animationDelay: `${index * 45}ms` }}
              key={ad.id}
              onClick={() => onOpen(ad)}
            >
              {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title} />}
              <h3>{ad.title}</h3>
              <p>{ad.price} ₽</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}