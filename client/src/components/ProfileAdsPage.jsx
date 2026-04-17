import { useEffect, useState } from "react";
import { getUserAds, archiveAd, restoreAd } from "../firebase";

const TITLES = {
  approved: "Активные объявления",
  pending: "На модерации",
  archived: "Архив",
  rejected: "Отклонённые",
};

export default function ProfileAdsPage({ user, status, onOpenAd }) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    loadAds();
  }, [user?.id, status]);

  const loadAds = async () => {
    if (!user?.id) return;
    const data = await getUserAds(user.id, status);
    setAds(data);
  };

  const handleArchive = async (adId) => {
    await archiveAd(adId);
    await loadAds();
  };

  const handleRestore = async (adId) => {
    await restoreAd(adId);
    await loadAds();
  };

  return (
    <div className="help-page page-enter">
      <div className="help-hero">
        <div className="help-badge">Профиль</div>
        <h2>{TITLES[status] || "Объявления"}</h2>
        <p>Здесь собраны объявления выбранной категории.</p>
      </div>

      <div className="help-card">
        {ads.length === 0 ? (
          <p>В этой категории пока ничего нет.</p>
        ) : (
          ads.map((ad) => (
            <div key={ad.id} className="profile-ad-row">
              <div className="profile-ad-main" onClick={() => onOpenAd(ad)}>
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.title} className="profile-ad-thumb" />
                ) : null}

                <div className="profile-ad-text">
                  <div className="profile-ad-title">{ad.title}</div>
                  <div className="profile-ad-meta">
                    {ad.price} ₽ · просмотров: {ad.views || 0}
                  </div>
                </div>
              </div>

              <div className="profile-ad-actions">
                <button className="soft-action-btn" onClick={() => onOpenAd(ad)}>
                  Открыть
                </button>

                {status === "approved" && (
                  <button className="soft-danger-btn" onClick={() => handleArchive(ad.id)}>
                    Снять
                  </button>
                )}

                {status === "archived" && (
                  <button className="soft-action-btn" onClick={() => handleRestore(ad.id)}>
                    Вернуть
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}