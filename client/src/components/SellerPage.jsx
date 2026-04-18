import { useEffect, useState } from "react";
import {
  getSellerApprovedAds,
  getSellerActiveAdsCount,
  getUserProfile,
} from "../firebase";
import PageBackButton from "./PageBackButton";

export default function SellerPage({ sellerId, onOpenAd, onBack }) {
  const [profile, setProfile] = useState(null);
  const [ads, setAds] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    loadSeller();
  }, [sellerId]);

  const loadSeller = async () => {
    if (!sellerId) {
      setProfile(null);
      setAds([]);
      setCount(0);
      return;
    }

    try {
      const [p, sellerAds, sellerCount] = await Promise.all([
        getUserProfile(sellerId),
        getSellerApprovedAds(sellerId),
        getSellerActiveAdsCount(sellerId),
      ]);

      setProfile(p);
      setAds(sellerAds || []);
      setCount(sellerCount || 0);
    } catch (error) {
      console.error("Ошибка загрузки продавца:", error);
      setProfile(null);
      setAds([]);
      setCount(0);
    }
  };

  if (!sellerId) {
    return (
      <div className="help-page page-enter">
        <PageBackButton onClick={onBack} />

        <div className="help-hero">
          <h2>Продавец недоступен</h2>
          <p>У этого объявления пока нет привязанного профиля продавца.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="help-page page-enter">
      <PageBackButton onClick={onBack} />

      <div className="help-hero">
        <div className="seller-profile-top">
          <div className="seller-profile-avatar">
            {(profile?.avatarUrl || profile?.telegramAvatarUrl) ? (
              <img
                src={profile.avatarUrl || profile.telegramAvatarUrl}
                alt="avatar"
                className="seller-profile-avatar-img"
              />
            ) : (
              <div className="avatar-placeholder" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8.2" r="3.2" />
                  <path d="M5.5 18.2C6.8 15.5 9.1 14.2 12 14.2C14.9 14.2 17.2 15.5 18.5 18.2" />
                </svg>
              </div>
            )}
          </div>

          <div className="seller-profile-info">
            <h2>{profile?.displayName || profile?.firstName || "Продавец"}</h2>

            <div className="seller-meta-row">
              <span>Активных объявлений: {count}</span>

              {profile?.isVerified ? (
                <span className="seller-verified-pill">Профиль подтвержден</span>
              ) : (
                <span className="seller-unverified-pill">Профиль не подтвержден</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {ads.length === 0 ? (
        <div className="help-card">
          <div className="help-card-title">Объявления продавца</div>
          <p>У продавца пока нет активных объявлений.</p>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div className="help-card-title" style={{ margin: "0 10px 10px" }}>
            Объявления продавца
          </div>

          <div className="grid" style={{ paddingBottom: 0 }}>
            {ads.map((ad, index) => (
              <div
                className="card card-appear card-press"
                style={{ animationDelay: `${index * 45}ms` }}
                key={ad.id}
                onClick={() => onOpenAd(ad)}
              >
                {ad.imageUrl && (
                  <div className="clean-card-image-wrap">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="clean-card-image-main"
                    />
                  </div>
                )}

                <h3>{ad.title}</h3>
                <p>{ad.price} ₽</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}