import { useEffect, useMemo, useState } from "react";
import { getAds, getUserProfile, getUserFavoriteIds, toggleFavoriteAd } from "../firebase";
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
  const iconProps = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" };

  if (type === "Все") {
    return (
      <svg {...iconProps}>
        <rect x="4" y="4" width="6" height="6" rx="1.6" />
        <rect x="14" y="4" width="6" height="6" rx="1.6" />
        <rect x="4" y="14" width="6" height="6" rx="1.6" />
        <rect x="14" y="14" width="6" height="6" rx="1.6" />
      </svg>
    );
  }

  if (type === "Телефоны") {
    return (
      <svg {...iconProps}>
        <rect x="7.3" y="3.5" width="9.4" height="17" rx="2.2" />
        <path d="M10.3 6.2H13.7" />
        <path d="M11.4 18H12.6" />
      </svg>
    );
  }

  if (type === "Компьютеры" || type === "Электроника") {
    return (
      <svg {...iconProps}>
        <rect x="4.5" y="5" width="15" height="10.5" rx="2" />
        <path d="M9 19H15" />
        <path d="M12 15.5V19" />
      </svg>
    );
  }

  if (type === "Наушники и аудио") {
    return (
      <svg {...iconProps}>
        <path d="M5.5 13.8V12A6.5 6.5 0 0 1 18.5 12V13.8" />
        <rect x="4.2" y="13" width="3.6" height="6" rx="1.4" />
        <rect x="16.2" y="13" width="3.6" height="6" rx="1.4" />
      </svg>
    );
  }

  if (type === "Фото и камеры") {
    return (
      <svg {...iconProps}>
        <path d="M8.2 7.2L9.7 5.3H14.3L15.8 7.2H18C19.1 7.2 20 8.1 20 9.2V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V9.2C4 8.1 4.9 7.2 6 7.2H8.2Z" />
        <circle cx="12" cy="13.2" r="3" />
      </svg>
    );
  }

  if (type === "Автотовары" || type === "Транспорт") {
    return (
      <svg {...iconProps}>
        <path d="M6.4 14.7H17.6" />
        <path d="M7.7 9.2H16.3L18.4 13.1V17.2H5.6V13.1L7.7 9.2Z" />
        <circle cx="8.4" cy="14.7" r="1.15" />
        <circle cx="15.6" cy="14.7" r="1.15" />
      </svg>
    );
  }

  if (type === "Мототовары") {
    return (
      <svg {...iconProps}>
        <circle cx="6.7" cy="16" r="2.7" />
        <circle cx="17.3" cy="16" r="2.7" />
        <path d="M9.2 16H12.4L14.4 11.6H10.6" />
        <path d="M14.4 11.6L17.3 16" />
        <path d="M12.4 16L8.8 10.8" />
        <path d="M15.2 9.6H18" />
      </svg>
    );
  }

  if (type === "Для дома" || type === "Мебель") {
    return (
      <svg {...iconProps}>
        <path d="M6.2 13.5V11.8C6.2 10.4 7.2 9.4 8.6 9.4H15.4C16.8 9.4 17.8 10.4 17.8 11.8V13.5" />
        <path d="M5.2 13.3H18.8V17.5H5.2V13.3Z" />
        <path d="M7 17.5V19.2" />
        <path d="M17 17.5V19.2" />
      </svg>
    );
  }

  if (type === "Бытовая техника") {
    return (
      <svg {...iconProps}>
        <rect x="6" y="4.5" width="12" height="15" rx="2" />
        <circle cx="12" cy="13" r="3.2" />
        <path d="M9 7.5H15" />
      </svg>
    );
  }

  if (type === "Одежда") {
    return (
      <svg {...iconProps}>
        <path d="M9 4.8L12 6.2L15 4.8L19 8.2L16.7 11V19.2H7.3V11L5 8.2L9 4.8Z" />
        <path d="M10.2 5.4C10.5 6.4 11.1 7 12 7C12.9 7 13.5 6.4 13.8 5.4" />
      </svg>
    );
  }

  if (type === "Обувь") {
    return (
      <svg {...iconProps}>
        <path d="M5.2 14.8C7.6 15.4 9.9 14.7 11.4 12.7L13.4 15.1H17.7C18.8 15.1 19.7 16 19.7 17.1V18.2H4.8V16.1C4.8 15.6 4.9 15.2 5.2 14.8Z" />
        <path d="M10.4 13.8L12.2 15.1" />
      </svg>
    );
  }

  if (type === "Аксессуары") {
    return (
      <svg {...iconProps}>
        <path d="M4.8 11.7L11.7 4.8H18.8V11.9L11.9 18.8L4.8 11.7Z" />
        <circle cx="16" cy="7.9" r="1.1" />
      </svg>
    );
  }

  if (type === "Красота и здоровье") {
    return (
      <svg {...iconProps}>
        <path d="M12 5.2V18.8" />
        <path d="M5.2 12H18.8" />
        <rect x="5" y="5" width="14" height="14" rx="4" />
      </svg>
    );
  }

  if (type === "Детские товары") {
    return (
      <svg {...iconProps}>
        <circle cx="9" cy="17" r="2" />
        <circle cx="16" cy="17" r="2" />
        <path d="M5.7 11.5H17.2L15.8 15H8.1L5.7 11.5Z" />
        <path d="M7.4 11.5C7.6 8.7 9.8 6.6 12.5 6.6" />
      </svg>
    );
  }

  if (type === "Игры и приставки") {
    return (
      <svg {...iconProps}>
        <rect x="4.5" y="9" width="15" height="8.5" rx="3" />
        <path d="M8 13.2H11" />
        <path d="M9.5 11.7V14.7" />
        <circle cx="15.3" cy="12.5" r="0.8" />
        <circle cx="17.2" cy="14.4" r="0.8" />
      </svg>
    );
  }

  if (type === "Спорт и отдых") {
    return (
      <svg {...iconProps}>
        <path d="M6 12H18" />
        <path d="M4.5 9.5V14.5" />
        <path d="M19.5 9.5V14.5" />
        <path d="M8 8.5V15.5" />
        <path d="M16 8.5V15.5" />
      </svg>
    );
  }

  if (type === "Инструменты") {
    return (
      <svg {...iconProps}>
        <path d="M14.8 5.2C15.9 4.8 17.2 5 18.1 5.9C19.2 7 19.3 8.7 18.6 10L10 18.6C9.2 19.4 7.9 19.4 7.1 18.6L5.4 16.9C4.6 16.1 4.6 14.8 5.4 14L14 5.4" />
        <path d="M14.8 5.2L18.8 9.2" />
      </svg>
    );
  }

  if (type === "Книги") {
    return (
      <svg {...iconProps}>
        <path d="M5.5 5.5H10.2C11.2 5.5 12 6.3 12 7.3V19C12 18 11.2 17.2 10.2 17.2H5.5V5.5Z" />
        <path d="M18.5 5.5H13.8C12.8 5.5 12 6.3 12 7.3V19C12 18 12.8 17.2 13.8 17.2H18.5V5.5Z" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M8.5 9H15.5" />
      <path d="M8.5 12H15.5" />
      <path d="M8.5 15H13.5" />
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
    <svg
      className="settings-gear-svg"
      viewBox="0 0 30 30"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M 15 2 C 14.448 2 14 2.448 14 3 L 14 3.171875 C 14 3.649875 13.663406 4.0763437 13.191406 4.1523438 C 12.962406 4.1893437 12.735719 4.2322031 12.511719 4.2832031 C 12.047719 4.3892031 11.578484 4.1265 11.396484 3.6875 L 11.330078 3.53125 C 11.119078 3.02125 10.534437 2.7782344 10.023438 2.9902344 C 9.5134375 3.2012344 9.2704219 3.785875 9.4824219 4.296875 L 9.5488281 4.4570312 C 9.7328281 4.8970313 9.5856875 5.4179219 9.1796875 5.6699219 C 8.9836875 5.7919219 8.7924688 5.9197344 8.6054688 6.0527344 C 8.2174688 6.3297344 7.68075 6.2666875 7.34375 5.9296875 L 7.2226562 5.8085938 C 6.8316562 5.4175937 6.1985937 5.4175938 5.8085938 5.8085938 C 5.4185938 6.1995938 5.4185938 6.8326563 5.8085938 7.2226562 L 5.9296875 7.34375 C 6.2666875 7.68075 6.3297344 8.2164688 6.0527344 8.6054688 C 5.9197344 8.7924687 5.7919219 8.9836875 5.6699219 9.1796875 C 5.4179219 9.5856875 4.8960781 9.7337812 4.4550781 9.5507812 L 4.296875 9.484375 C 3.786875 9.273375 3.2002813 9.5153906 2.9882812 10.025391 C 2.7772813 10.535391 3.0192969 11.120031 3.5292969 11.332031 L 3.6855469 11.396484 C 4.1245469 11.578484 4.3892031 12.047719 4.2832031 12.511719 C 4.2322031 12.735719 4.1873906 12.962406 4.1503906 13.191406 C 4.0753906 13.662406 3.649875 14 3.171875 14 L 3 14 C 2.448 14 2 14.448 2 15 C 2 15.552 2.448 16 3 16 L 3.171875 16 C 3.649875 16 4.0763437 16.336594 4.1523438 16.808594 C 4.1893437 17.037594 4.2322031 17.264281 4.2832031 17.488281 C 4.3892031 17.952281 4.1265 18.421516 3.6875 18.603516 L 3.53125 18.669922 C 3.02125 18.880922 2.7782344 19.465563 2.9902344 19.976562 C 3.2012344 20.486563 3.785875 20.729578 4.296875 20.517578 L 4.4570312 20.451172 C 4.8980312 20.268172 5.418875 20.415312 5.671875 20.820312 C 5.793875 21.016313 5.9206875 21.208484 6.0546875 21.396484 C 6.3316875 21.784484 6.2686406 22.321203 5.9316406 22.658203 L 5.8085938 22.779297 C 5.4175937 23.170297 5.4175938 23.803359 5.8085938 24.193359 C 6.1995938 24.583359 6.8326562 24.584359 7.2226562 24.193359 L 7.3457031 24.072266 C 7.6827031 23.735266 8.2174688 23.670266 8.6054688 23.947266 C 8.7934688 24.081266 8.9856406 24.210031 9.1816406 24.332031 C 9.5866406 24.584031 9.7357344 25.105875 9.5527344 25.546875 L 9.4863281 25.705078 C 9.2753281 26.215078 9.5173438 26.801672 10.027344 27.013672 C 10.537344 27.224672 11.121984 26.982656 11.333984 26.472656 L 11.398438 26.316406 C 11.580438 25.877406 12.049672 25.61275 12.513672 25.71875 C 12.737672 25.76975 12.964359 25.814562 13.193359 25.851562 C 13.662359 25.924562 14 26.350125 14 26.828125 L 14 27 C 14 27.552 14.448 28 15 28 C 15.552 28 16 27.552 16 27 L 16 26.828125 C 16 26.350125 16.336594 25.923656 16.808594 25.847656 C 17.037594 25.810656 17.264281 25.767797 17.488281 25.716797 C 17.952281 25.610797 18.421516 25.8735 18.603516 26.3125 L 18.669922 26.46875 C 18.880922 26.97875 19.465563 27.221766 19.976562 27.009766 C 20.486563 26.798766 20.729578 26.214125 20.517578 25.703125 L 20.451172 25.542969 C 20.268172 25.101969 20.415312 24.581125 20.820312 24.328125 C 21.016313 24.206125 21.208484 24.079312 21.396484 23.945312 C 21.784484 23.668312 22.321203 23.731359 22.658203 24.068359 L 22.779297 24.191406 C 23.170297 24.582406 23.803359 24.582406 24.193359 24.191406 C 24.583359 23.800406 24.584359 23.167344 24.193359 22.777344 L 24.072266 22.654297 C 23.735266 22.317297 23.670266 21.782531 23.947266 21.394531 C 24.081266 21.206531 24.210031 21.014359 24.332031 20.818359 C 24.584031 20.413359 25.105875 20.264266 25.546875 20.447266 L 25.705078 20.513672 C 26.215078 20.724672 26.801672 20.482656 27.013672 19.972656 C 27.224672 19.462656 26.982656 18.878016 26.472656 18.666016 L 26.316406 18.601562 C 25.877406 18.419563 25.61275 17.950328 25.71875 17.486328 C 25.76975 17.262328 25.814562 17.035641 25.851562 16.806641 C 25.924562 16.337641 26.350125 16 26.828125 16 L 27 16 C 27.552 16 28 15.552 28 15 C 28 14.448 27.552 14 27 14 L 26.828125 14 C 26.350125 14 25.923656 13.663406 25.847656 13.191406 C 25.810656 12.962406 25.767797 12.735719 25.716797 12.511719 C 25.610797 12.047719 25.8735 11.578484 26.3125 11.396484 L 26.46875 11.330078 C 26.97875 11.119078 27.221766 10.534437 27.009766 10.023438 C 26.798766 9.5134375 26.214125 9.2704219 25.703125 9.4824219 L 25.542969 9.5488281 C 25.101969 9.7318281 24.581125 9.5846875 24.328125 9.1796875 C 24.206125 8.9836875 24.079312 8.7915156 23.945312 8.6035156 C 23.668312 8.2155156 23.731359 7.6787969 24.068359 7.3417969 L 24.191406 7.2207031 C 24.582406 6.8297031 24.582406 6.1966406 24.191406 5.8066406 C 23.800406 5.4156406 23.167344 5.4156406 22.777344 5.8066406 L 22.65625 5.9296875 C 22.31925 6.2666875 21.782531 6.3316875 21.394531 6.0546875 C 21.206531 5.9206875 21.014359 5.7919219 20.818359 5.6699219 C 20.413359 5.4179219 20.266219 4.8960781 20.449219 4.4550781 L 20.515625 4.296875 C 20.726625 3.786875 20.484609 3.2002812 19.974609 2.9882812 C 19.464609 2.7772813 18.879969 3.0192969 18.667969 3.5292969 L 18.601562 3.6855469 C 18.419563 4.1245469 17.950328 4.3892031 17.486328 4.2832031 C 17.262328 4.2322031 17.035641 4.1873906 16.806641 4.1503906 C 16.336641 4.0753906 16 3.649875 16 3.171875 L 16 3 C 16 2.448 15.552 2 15 2 z M 15 7 C 19.078645 7 22.438586 10.054876 22.931641 14 L 16.722656 14 C 16.376387 13.404366 15.738946 13 15 13 L 11.896484 7.625 C 12.850999 7.222729 13.899211 7 15 7 z M 10.169922 8.6328125 L 13.273438 14.007812 C 13.104603 14.30117 13 14.63706 13 15 C 13 15.361994 13.103465 15.697397 13.271484 15.990234 L 10.167969 21.365234 C 8.2464258 19.903996 7 17.600071 7 15 C 7 12.398945 8.2471371 10.093961 10.169922 8.6328125 z M 16.722656 16 L 22.931641 16 C 22.438586 19.945124 19.078645 23 15 23 C 13.899211 23 12.850999 22.777271 11.896484 22.375 L 14.998047 17 C 14.998047 17 15 17 15 17 C 15.738946 17 16.376387 16.595634 16.722656 16 z" />
    </svg>
  );
}

function MainHeader({ onOpenSettings }) {
  return (
    <header className="market-header market-header-no-theme">
      <div className="market-city">Вологда</div>

      <div className="market-title-wrap">
        <h1>Барахолка</h1>
        <p>мини-приложение</p>
      </div>

      <div className="market-header-actions">
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

      <span className="verified-sellers-toggle" aria-hidden="true">
        <span className="verified-sellers-toggle-knob" />
      </span>
    </button>
  );
}

function FavoriteHeartIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20.2C9.8 18.35 7.95 16.7 6.4 15.05C4.85 13.4 4 11.78 4 9.9C4 7.85 5.55 6.3 7.6 6.3C8.78 6.3 9.95 6.85 10.7 7.75L12 9.3L13.3 7.75C14.05 6.85 15.22 6.3 16.4 6.3C18.45 6.3 20 7.85 20 9.9C20 11.78 19.15 13.4 17.6 15.05C16.05 16.7 14.2 18.35 12 20.2Z" />
    </svg>
  );
}

function MarketAdCard({ ad, index, onOpen, isFavorite, onToggleFavorite }) {
  const image = getAdImage(ad);

  return (
    <button
      type="button"
      className={`market-card ${getPromotionRank(ad) > 0 ? "market-card-promoted" : ""}`}
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={() => onOpen(ad)}
    >
      <div className="market-card-image-wrap">
        <span
          role="button"
          tabIndex={0}
          className={`favorite-card-btn ${isFavorite ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite?.(ad);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.(ad);
            }
          }}
          aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <FavoriteHeartIcon active={isFavorite} />
        </span>

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

function SellFasterBanner({ onClick }) {
  return (
    <button type="button" className="sell-faster-banner" onClick={onClick}>
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
    </button>
  );
}

export default function AdList({
  onOpen,
  onOpenSettings,
  onCreate,
  initialAds = [],
  initialVerifiedSellerIds = [],
  currentUser,
}) {
  const [ads, setAds] = useState(() => Array.isArray(initialAds) ? initialAds : []);
  const [loading, setLoading] = useState(() => !(Array.isArray(initialAds) && initialAds.length > 0));
  const [selectedCategory, setSelectedCategory] = useState(
    () => localStorage.getItem("ads_filter_category") || ""
  );
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [verifiedSellerIds, setVerifiedSellerIds] = useState(
    () => new Set(Array.isArray(initialVerifiedSellerIds) ? initialVerifiedSellerIds : [])
  );
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [favoriteMessage, setFavoriteMessage] = useState("");

  useEffect(() => {
    if (Array.isArray(initialAds) && initialAds.length > 0) {
      setAds(sortAds(initialAds));
      setLoading(false);
      return;
    }

    loadAds();
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [currentUser?.id]);

  const loadFavorites = async () => {
    if (!currentUser?.id) {
      setFavoriteIds(new Set());
      return;
    }

    try {
      const ids = await getUserFavoriteIds(currentUser.id);
      setFavoriteIds(new Set(ids.map(String)));
    } catch (error) {
      console.warn("Не удалось загрузить избранное:", error);
    }
  };

  const handleToggleFavorite = async (ad) => {
    if (!currentUser?.id) {
      setFavoriteMessage("Для добавления товара в избранное нужно быть авторизованным в приложении через Telegram");
      window.setTimeout(() => setFavoriteMessage(""), 3600);
      return;
    }

    if (!ad?.id) return;

    const adId = String(ad.id);
    const wasFavorite = favoriteIds.has(adId);

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(adId);
      else next.add(adId);
      return next;
    });

    try {
      const isFavoriteNow = await toggleFavoriteAd(currentUser.id, adId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavoriteNow) next.add(adId);
        else next.delete(adId);
        return next;
      });
      setFavoriteMessage(isFavoriteNow ? "Добавлено в избранное" : "Удалено из избранного");
      window.setTimeout(() => setFavoriteMessage(""), 1800);
    } catch (error) {
      console.error("Ошибка избранного:", error);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(adId);
        else next.delete(adId);
        return next;
      });
      setFavoriteMessage("Не удалось обновить избранное. Попробуй ещё раз.");
      window.setTimeout(() => setFavoriteMessage(""), 2600);
    }
  };

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
        <MainHeader onOpenSettings={onOpenSettings} />

        {!!favoriteMessage && <div className="favorite-toast">{favoriteMessage}</div>}

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
      <MainHeader onOpenSettings={onOpenSettings} />

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
            <MarketAdCard
              key={ad.id}
              ad={ad}
              index={index}
              onOpen={onOpen}
              isFavorite={favoriteIds.has(String(ad.id))}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}

      <SellFasterBanner onClick={onCreate} />
    </main>
  );
}
