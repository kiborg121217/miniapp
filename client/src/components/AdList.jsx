import { useEffect, useMemo, useRef, useState } from "react";
import { getAds } from "../firebase";
import { CATEGORIES } from "../categories";

export default function AdList({ onOpen, theme, onToggleTheme, onOpenSettings }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    () => localStorage.getItem("ads_filter_category") || ""
  );
  const [draftCategory, setDraftCategory] = useState(
    () => localStorage.getItem("ads_filter_category") || ""
  );

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

  const filteredAds = useMemo(() => {
    if (!selectedCategory) return ads;
    return ads.filter((ad) => ad.category === selectedCategory);
  }, [ads, selectedCategory]);

  const applyFilter = () => {
    setSelectedCategory(draftCategory);
    localStorage.setItem("ads_filter_category", draftCategory);
    setShowFilter(false);
  };

  const resetFilter = () => {
    setDraftCategory("");
    setSelectedCategory("");
    localStorage.removeItem("ads_filter_category");
    setShowFilter(false);
  };

  return (
    <div style={{ padding: "92px 10px 120px" }}>
      <div className={`top-bar ${headerHidden ? "header-hidden" : ""}`}>
        <button className="top-icon-btn" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 7H18" />
            <path d="M6 12H18" />
            <path d="M6 17H18" />
            <circle cx="9" cy="7" r="1.75" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1.75" fill="currentColor" stroke="none" />
            <circle cx="11" cy="17" r="1.75" fill="currentColor" stroke="none" />
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

      <div className="filter-bar">
        <button className="filter-trigger" onClick={() => setShowFilter(true)}>
          <span className="filter-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4.5 7H19.5" />
              <path d="M7.5 12H16.5" />
              <path d="M10 17H14" />
            </svg>
          </span>
          <span>Фильтр</span>
        </button>

        {selectedCategory && (
          <div className="filter-chip-active">
            {selectedCategory}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card"></div>
          ))}
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="empty-state page-enter">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="5" y="4.5" width="14" height="15" rx="3.5" />
              <path d="M8.5 9.5H15.5" />
              <path d="M8.5 13H15.5" />
              <path d="M10 7.25H14" />
            </svg>
          </div>
          <h3>{selectedCategory ? "В этой категории пока пусто" : "Пока объявлений нет"}</h3>
          <p>
            {selectedCategory
              ? "Попробуй выбрать другую категорию или сбросить фильтр."
              : "Нажми «Создать» внизу и размести первое объявление."}
          </p>
        </div>
      ) : (
        <div className="grid">
          {filteredAds.map((ad, index) => (
            <div
              className="card card-appear card-press"
              style={{ animationDelay: `${index * 45}ms` }}
              key={ad.id}
              onClick={() => onOpen(ad)}
            >
              {ad.imageUrl && (
                <div className="clean-card-image-wrap">
                  <img src={ad.imageUrl} alt={ad.title} className="clean-card-image-main" />
                </div>
              )}

              <h3>{ad.title}</h3>
              <p>{ad.price} ₽</p>
            </div>
          ))}
        </div>
      )}

      {showFilter && (
        <div className="sheet-backdrop" onClick={() => setShowFilter(false)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">Фильтр объявлений</div>

            <div className="filter-group-label">Категория</div>
            <button
              type="button"
              className="picker-trigger"
              onClick={() => {}}
            >
              {draftCategory || "Выберите категорию"}
            </button>

            <div className="category-list filter-category-list">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`category-option ${draftCategory === item ? "active" : ""}`}
                  onClick={() => setDraftCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="filter-actions">
              <button type="button" className="filter-apply-btn" onClick={applyFilter}>
                Применить
              </button>
              <button type="button" className="filter-reset-btn" onClick={resetFilter}>
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}