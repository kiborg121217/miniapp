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
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 8.8a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 0 0 0-6.4Z" />
            <path d="M19.4 13.5a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1-1.4 1.4l-.1-.1a1 1 0 0 0-1.1-.2a1 1 0 0 0-.6.9V17a1 1 0 1 1-2 0v-.2a1 1 0 0 0-.7-.9a1 1 0 0 0-1.1.2l-.1.1a1 1 0 1 1-1.4-1.4l.1-.1a1 1 0 0 0 .2-1.1a1 1 0 0 0-.9-.6H7a1 1 0 1 1 0-2h.2a1 1 0 0 0 .9-.7a1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 1 1 1.4-1.4l.1.1a1 1 0 0 0 1.1.2a1 1 0 0 0 .6-.9V7a1 1 0 1 1 2 0v.2a1 1 0 0 0 .7.9a1 1 0 0 0 1.1-.2l.1-.1a1 1 0 1 1 1.4 1.4l-.1.1a1 1 0 0 0-.2 1.1a1 1 0 0 0 .9.6H17a1 1 0 1 1 0 2h-.2a1 1 0 0 0-.9.7Z" />
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
                <div className="card-image-wrap">
                  <div
                    className="card-image-blur"
                    style={{ backgroundImage: `url(${ad.imageUrl})` }}
                  />
                  <img src={ad.imageUrl} alt={ad.title} className="card-image-main" />
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