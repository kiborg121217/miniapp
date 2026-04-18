import { useEffect, useMemo, useRef, useState } from "react";
import { getAds } from "../firebase";
import { CATEGORIES } from "../categories";

function isActiveUntil(value) {
  return typeof value === "number" && value > Date.now();
}

function getPromotionRank(ad) {
  const pinned = !!ad.isPinned && isActiveUntil(ad.pinnedUntil);
  const vip = !!ad.isVip && isActiveUntil(ad.vipUntil);
  const boosted = isActiveUntil(ad.boostUntil);

  if (pinned) return 3;
  if (vip && boosted) return 2;
  if (vip) return 1;
  if (boosted) return 1;
  return 0;
}

function sortAds(list) {
  return [...list].sort((a, b) => {
    const rankA = getPromotionRank(a);
    const rankB = getPromotionRank(b);

    if (rankA !== rankB) return rankB - rankA;

    const pinA = a.pinnedUntil || 0;
    const pinB = b.pinnedUntil || 0;
    if (pinA !== pinB) return pinB - pinA;

    const vipA = a.vipUntil || 0;
    const vipB = b.vipUntil || 0;
    if (vipA !== vipB) return vipB - vipA;

    const boostA = a.boostedAt || a.createdAt || 0;
    const boostB = b.boostedAt || b.createdAt || 0;
    return boostB - boostA;
  });
}

function CardBadges({ ad }) {
  const pinned = !!ad.isPinned && isActiveUntil(ad.pinnedUntil);
  const vip = !!ad.isVip && isActiveUntil(ad.vipUntil);
  const boosted = isActiveUntil(ad.boostUntil);

  if (!pinned && !vip && !boosted) return null;

  return (
    <div className="promo-badges">
      {pinned && <span className="promo-badge promo-badge-pin">Закреплено</span>}
      {vip && <span className="promo-badge promo-badge-vip">VIP</span>}
      {!vip && boosted && <span className="promo-badge promo-badge-boost">Поднято</span>}
      {pinned && vip && boosted && (
        <span className="promo-badge promo-badge-turbo">TURBO</span>
      )}
    </div>
  );
}

export default function AdList({ onOpen, theme, onToggleTheme }) {
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
    setAds(sortAds(approved));
    setLoading(false);
  };

  const filteredAds = useMemo(() => {
    if (!selectedCategory) return ads;
    return ads.filter((ad) => ad.category === selectedCategory);
  }, [ads, selectedCategory]);

  const applyFilter = () => {
    setSelectedCategory(draftCategory);
    if (draftCategory) {
      localStorage.setItem("ads_filter_category", draftCategory);
    } else {
      localStorage.removeItem("ads_filter_category");
    }
    setShowFilter(false);
  };

  const resetFilter = () => {
    setDraftCategory("");
    setSelectedCategory("");
    localStorage.removeItem("ads_filter_category");
    setShowFilter(false);
  };

  if (loading) {
    return (
      <div style={{ padding: "92px 10px 120px" }}>
        <div className={`header-shell ${headerHidden ? "header-hidden" : ""}`}>
          <div
            className="header compact-header"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <h2>Объявления</h2>
          </div>

          <button className="theme-toggle" onClick={onToggleTheme}>
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
        </div>

        <div className="grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card"></div>
          ))}
        </div>

        {showFilter && (
          <div className="ios-sheet-backdrop" onClick={() => setShowFilter(false)}>
            <div className="ios-sheet-wrap" onClick={(e) => e.stopPropagation()}>
              <div className="ios-sheet-card">
                <div className="ios-sheet-header">
                  <div className="ios-sheet-title">Фильтр объявлений</div>
                  <div className="ios-sheet-subtitle">
                    Выбери категорию для показа объявлений
                  </div>
                </div>

                <div className="ios-sheet-list">
                  {CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`ios-sheet-option ${draftCategory === item ? "active" : ""}`}
                      onClick={() => setDraftCategory(item)}
                    >
                      <span>{item}</span>
                      {draftCategory === item && (
                        <span className="ios-sheet-check" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M7 12.5L10.2 15.5L17 8.5" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ios-sheet-actions">
                <button type="button" className="ios-sheet-apply" onClick={applyFilter}>
                  Применить
                </button>
                <button type="button" className="ios-sheet-cancel" onClick={resetFilter}>
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "92px 10px 120px" }}>
      <div className={`header-shell ${headerHidden ? "header-hidden" : ""}`}>
        <div
          className="header compact-header"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <h2>Объявления</h2>
        </div>

        <button className="theme-toggle" onClick={onToggleTheme}>
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

        {selectedCategory && <div className="filter-chip-active">{selectedCategory}</div>}
      </div>

      {filteredAds.length === 0 ? (
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
              className={`card card-appear card-press ${
                getPromotionRank(ad) > 0 ? "card-promoted" : ""
              } ${ad.isVip && isActiveUntil(ad.vipUntil) ? "card-vip" : ""} ${
                ad.isPinned && isActiveUntil(ad.pinnedUntil) ? "card-pinned" : ""
              }`}
              style={{ animationDelay: `${index * 45}ms` }}
              key={ad.id}
              onClick={() => onOpen(ad)}
            >
              <CardBadges ad={ad} />
              {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title} />}
              <h3>{ad.title}</h3>
              <p>{ad.price} ₽</p>
            </div>
          ))}
        </div>
      )}

      {showFilter && (
        <div className="ios-sheet-backdrop" onClick={() => setShowFilter(false)}>
          <div className="ios-sheet-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-card">
              <div className="ios-sheet-header">
                <div className="ios-sheet-title">Фильтр объявлений</div>
                <div className="ios-sheet-subtitle">
                  Выбери категорию для показа объявлений
                </div>
              </div>

              <div className="ios-sheet-list">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`ios-sheet-option ${draftCategory === item ? "active" : ""}`}
                    onClick={() => setDraftCategory(item)}
                  >
                    <span>{item}</span>
                    {draftCategory === item && (
                      <span className="ios-sheet-check" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M7 12.5L10.2 15.5L17 8.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="ios-sheet-actions">
              <button type="button" className="ios-sheet-apply" onClick={applyFilter}>
                Применить
              </button>
              <button type="button" className="ios-sheet-cancel" onClick={resetFilter}>
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}