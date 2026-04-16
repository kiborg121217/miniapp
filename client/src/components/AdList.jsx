import { useEffect, useRef, useState } from "react";
import { getAds } from "../firebase";

export default function AdList({ onOpen, theme, onToggleTheme }) {
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

  const ThemeButton = () => (
    <button className="theme-toggle floating-theme-toggle" onClick={onToggleTheme}>
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
  );

  if (loading) {
    return (
      <div style={{ padding: "92px 8px 120px" }}>
        <div className={`header-shell ${headerHidden ? "header-hidden" : ""}`}>
          <div
            className="header compact-header"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <h2>Объявления</h2>
          </div>
        </div>

        <ThemeButton />

        <div className="grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "92px 8px 120px" }}>
      <div className={`header-shell ${headerHidden ? "header-hidden" : ""}`}>
        <div
          className="header compact-header"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <h2>Объявления</h2>
        </div>
      </div>

      <ThemeButton />

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
            Нажми <strong>«Создать»</strong> внизу и размести первое объявление.
          </p>
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