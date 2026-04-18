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
    if (!sellerId) return;

    const [p, sellerAds, sellerCount] = await Promise.all([
      getUserProfile(sellerId),
      getSellerApprovedAds(sellerId),
      getSellerActiveAdsCount(sellerId),
    ]);

    setProfile(p);
    setAds(sellerAds);
    setCount(sellerCount);
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              flexShrink: 0,
            }}
          >
            {(profile?.avatarUrl || profile?.telegramAvatarUrl) ? (
              <img
                src={profile.avatarUrl || profile.telegramAvatarUrl}
                alt="avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : null}
          </div>

          <div>
            <h2 style={{ margin: 0 }}>
              {profile?.displayName || profile?.firstName || "Продавец"}
            </h2>
            <p style={{ marginTop: 8 }}>
              Активных объявлений: {count}
            </p>
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