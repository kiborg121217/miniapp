import { useEffect, useMemo, useState } from "react";
import { getAds, getUserProfile } from "../firebase";
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

function formatPrice(value) {
  const numeric = Number(String(value || "").replace(/\D/g, ""));

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return value ? `${value} ₽` : "Цена не указана";
  }

  return `${new Intl.NumberFormat("ru-RU").format(numeric)} ₽`;
}

function getAdImage(ad) {
  if (Array.isArray(ad.imageUrls) && ad.imageUrls.length > 0) return ad.imageUrls[0];
  return ad.imageUrl || "";
}

function CategoryIcon({ type }) {
  if (type === "Все") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="6" height="6" rx="1.6" />
        <rect x="14" y="4" width="6" height="6" rx="1.6" />
        <rect x="4" y="14" width="6" height="6" rx="1.6" />
        <rect x="14" y="14" width="6" height="6" rx="1.6" />
      </svg>
    );
  }

  if (["Транспорт", "Автотовары", "Мототовары"].includes(type)) {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6.5 15.5H17.5" />
        <path d="M7.8 9.2H16.2L18.4 13.3V17.2H5.6V13.3L7.8 9.2Z" />
        <path d="M8 17.2V18.3" />
        <path d="M16 17.2V18.3" />
        <circle cx="8.3" cy="14.5" r="1" />
        <circle cx="15.7" cy="14.5" r="1" />
      </svg>
    );
  }

  if (["Для дома", "Мебель", "Бытовая техника"].includes(type)) {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8.5 7.5V16.5" />
        <path d="M8.5 10.5H15.5C17 10.5 18 11.5 18 13V16.5" />
        <path d="M6.5 16.5H19" />
        <path d="M8 16.5V19" />
        <path d="M17.5 16.5V19" />
      </svg>
    );
  }

  if (["Одежда", "Обувь", "Аксессуары"].includes(type)) {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 4.8L12 6.2L15 4.8L19 8.2L16.7 11V19.2H7.3V11L5 8.2L9 4.8Z" />
        <path d="M10.2 5.4C10.5 6.4 11.1 7 12 7C12.9 7 13.5 6.4 13.8 5.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="5" y="5" width="14" height="10" rx="2" />
      <path d="M9 19H15" />
      <path d="M12 15V19" />
    </svg>
  );
}

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return (
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
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M20 15.2A7.8 7.8 0 1 1 8.8 4A6.5 6.5 0 0 0 20 15.2Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.2V5.1" />
      <path d="M12 18.9V20.8" />
      <path d="M5.78 5.78L7.12 7.12" />
      <path d="M16.88 16.88L18.22 18.22" />
      <path d="M3.2 12H5.1" />
      <path d="M18.9 12H20.8" />
      <path d="M5.78 18.22L7.12 16.88" />
      <path d="M16.88 7.12L18.22 5.78" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="1.45" />
    </svg>
  );
}

function MainHeader({ theme, onToggleTheme, onOpenSettings }) {
  return (
    <header className="market-header">
      <div className="market-city">Вологда</div>

      <div className="market-title-wrap">
        <h1>Барахолка</h1>
        <p>мини-приложение</p>
      </div>

      <div className="market-header-actions">
        <button className="market-icon-btn" onClick={onToggleTheme} aria-label="Сменить тему">
          <ThemeIcon theme={theme} />
        </button>

        <button className="market-icon-btn" onClick={onOpenSettings} aria-label="Настройки">
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}

function CategoryRail({ selectedCategory, onSelectCategory }) {
  const categories = ["Все", ...CATEGORIES];

  return (
    <div className="market-category-rail" aria-label="Категории">
      {categories.map((category) => {
        const isActive = category === "Все" ? !selectedCategory : selectedCategory === category;

        return (
          <button
            key={category}
            type="button"
            className={`market-category-chip ${isActive ? "active" : ""}`}
            onClick={() => onSelectCategory(category === "Все" ? "" : category)}
          >
            <span className="market-category-icon" aria-hidden="true">
              <CategoryIcon type={category} />
            </span>
            <span>{category}</span>
          </button>
        );
      })}
    </div>
  );
}

function VerifiedSellersBanner({ active, onToggle }) {
  return (
    <button
      type="button"
      className={`verified-sellers-banner ${active ? "active" : ""}`}
      onClick={onToggle}
      aria-pressed={active}
    >
      <div className="verified-sellers-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 3.8L18.5 6.6V11.7C18.5 15.7 15.8 18.8 12 20.3C8.2 18.8 5.5 15.7 5.5 11.7V6.6L12 3.8Z" />
          <path d="M8.8 12.1L10.8 14.1L15.4 9.4" />
        </svg>
      </div>

      <div className="verified-sellers-text">
        <h2>{active ? "Проверенные включены" : "Проверенные продавцы"}</h2>
        <p>{active ? "Показаны только подтвержденные" : "Только надежные сделки"}</p>
      </div>

      <span className="verified-sellers-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d={active ? "M15 6L9 12L15 18" : "M9 5L16 12L9 19"} />
        </svg>
      </span>
    </button>
  );
}

function MarketAdCard({ ad, index, onOpen }) {
  const image = getAdImage(ad);

  return (
    <button
      type="button"
      className={`market-card ${getPromotionRank(ad) > 0 ? "market-card-promoted" : ""}`}
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={() => onOpen(ad)}
    >
      <div className="market-card-image-wrap">
        {image ? (
          <img src={image} alt={ad.title} className="market-card-image" />
        ) : (
          <div className="market-card-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4.5" y="5" width="15" height="14" rx="3" />
              <path d="M8 14L10.4 11.6L13 14.2L14.6 12.6L17 15" />
              <circle cx="9" cy="9" r="1" />
            </svg>
          </div>
        )}
      </div>

      <div className="market-card-body">
        <div className="market-card-title">{ad.title}</div>
        <div className="market-card-price">{formatPrice(ad.price)}</div>
        <div className="market-card-location">{ad.city || "Вологда"}</div>
      </div>
    </button>
  );
}

function SellFasterBanner() {
  return (
    <div className="sell-faster-banner">
      <div className="sell-faster-plus" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19" />
          <path d="M5 12H19" />
        </svg>
      </div>

      <div className="sell-faster-text">
        <h2>Продайте быстрее</h2>
        <p>Разместите объявление прямо сейчас</p>
      </div>

      <span className="sell-faster-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9 5L16 12L9 19" />
        </svg>
      </span>
    </div>
  );
}

export default function AdList({
  onOpen,
  theme,
  onToggleTheme,
  onOpenSettings,
}) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(
    () => localStorage.getItem("ads_filter_category") || ""
  );
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [verifiedSellerIds, setVerifiedSellerIds] = useState(() => new Set());

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      const data = await getAds();
      const approved = data.filter((ad) => ad.status === "approved");
      setAds(sortAds(approved));

      const sellerIds = [...new Set(approved.map((ad) => String(ad.userId || "")).filter(Boolean))];
      const profiles = await Promise.all(
        sellerIds.map(async (sellerId) => {
          try {
            const profile = await getUserProfile(sellerId);
            return profile?.isVerified ? sellerId : null;
          } catch (error) {
            console.warn("Не удалось проверить профиль продавца:", sellerId, error);
            return null;
          }
        })
      );

      setVerifiedSellerIds(new Set(profiles.filter(Boolean)));
    } catch (error) {
      console.error("Ошибка загрузки объявлений:", error);
      setAds([]);
      setVerifiedSellerIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const filteredAds = useMemo(() => {
    let result = ads;

    if (selectedCategory) {
      result = result.filter((ad) => ad.category === selectedCategory);
    }

    if (verifiedOnly) {
      result = result.filter((ad) => verifiedSellerIds.has(String(ad.userId || "")));
    }

    return result;
  }, [ads, selectedCategory, verifiedOnly, verifiedSellerIds]);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);

    if (category) {
      localStorage.setItem("ads_filter_category", category);
    } else {
      localStorage.removeItem("ads_filter_category");
    }
  };

  if (loading) {
    return (
      <main className="market-home page-enter">
        <MainHeader
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenSettings={onOpenSettings}
        />

        <CategoryRail
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        <VerifiedSellersBanner active={verifiedOnly} onToggle={() => setVerifiedOnly((value) => !value)} />

        <div className="market-section-head">
          <h2>Популярные объявления</h2>
        </div>

        <div className="market-grid">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="market-card market-card-skeleton" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="market-home page-enter">
      <MainHeader
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenSettings={onOpenSettings}
      />

      <CategoryRail
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      <VerifiedSellersBanner active={verifiedOnly} onToggle={() => setVerifiedOnly((value) => !value)} />

      <div className="market-section-head">
        <h2>
          {verifiedOnly
            ? "Проверенные объявления"
            : selectedCategory
            ? selectedCategory
            : "Популярные объявления"}
        </h2>
        {(selectedCategory || verifiedOnly) && (
          <button
            type="button"
            onClick={() => {
              handleSelectCategory("");
              setVerifiedOnly(false);
            }}
          >
            Сбросить
          </button>
        )}
      </div>

      {filteredAds.length === 0 ? (
        <div className="market-empty-state">
          <div className="market-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4.5" y="5" width="15" height="14" rx="3" />
              <path d="M8 14L10.4 11.6L13 14.2L14.6 12.6L17 15" />
            </svg>
          </div>
          <h3>
            {verifiedOnly
              ? "У проверенных продавцов пока пусто"
              : selectedCategory
              ? "В этой категории пока пусто"
              : "Пока объявлений нет"}
          </h3>
          <p>
            {verifiedOnly || selectedCategory
              ? "Сбрось фильтр или выбери другую категорию."
              : "Нажми «Создать» внизу и размести первое объявление."}
          </p>
        </div>
      ) : (
        <div className="market-grid">
          {filteredAds.map((ad, index) => (
            <MarketAdCard key={ad.id} ad={ad} index={index} onOpen={onOpen} />
          ))}
        </div>
      )}

      <SellFasterBanner />
    </main>
  );
}
