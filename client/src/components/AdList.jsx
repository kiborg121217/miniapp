import { useEffect, useRef, useState } from "react";
import { getAds } from "../firebase";

export default function AdList({ onOpen, theme, onToggleTheme, onOpenSettings }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadAds = async () => {
    const data = await getAds();
    const approved = data.filter((ad) => ad.status === "approved");
    setAds(approved.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  };

  return (
    <div style={{ padding: "92px 10px 120px" }}>
      <div className={`top-bar ${headerHidden ? "header-hidden" : ""}`}>
        <button className="top-icon-btn" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3.1" />
            <path d="M12 2.9L13.05 5.15L15.55 5.55L16.15 8L18.4 9.05L17.8 11.5L19.6 12L17.8 12.5L18.4 14.95L16.15 16L15.55 18.45L13.05 18.85L12 21.1L10.95 18.85L8.45 18.45L7.85 16L5.6 14.95L6.2 12.5L4.4 12L6.2 11.5L5.6 9.05L7.85 8L8.45 5.55L10.95 5.15L12 2.9Z" />
          </svg>
        </button>

        <div
          className="header compact-header"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <h2>Объявления</h2>
        </div>

        <button className="top-icon-btn" onClick={onToggleTheme}>
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5V5" />
              <path d="M12 19V21.5" />
              <path d="M4.93 4.93L6.7 6.7" />
              <path d="M17.3 17.3L19.07 19.07" />
              <path d="M2.5 12H5" />
              <path d="M19 12H21.5" />
              <path d="M4.93 19.07L6.7 17.3" />
              <path d="M17.3 6.7L19.07 4.93" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M20 15.2A7.8 7.8 0 1 1 8.8 4 6.5 6.5 0 0 0 20 15.2Z" />
            </svg>
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card"></div>
          ))}
        </div>
      ) : ads.length === 0 ? (
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
          <p>Нажми «Создать» внизу и размести первое объявление.</p>
        </div>
      ) : (
        <div className="grid">
          {ads.map((ad, index) => (
            <div
              className="card card-appear card-press"
              style={{ animationDelay: `${index * 45}ms` }}
              key={ad.id}
              onClick={() => onOpen(ad)}
            >
              {ad.imageUrl && (
                <div className="card-image-wrap clean-card-image-wrap">
                  <img src={ad.imageUrl} alt={ad.title} className="clean-card-image-main" />
                </div>
              )}

              <h3>{ad.title}</h3>
              <p>{ad.price} ₽</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}