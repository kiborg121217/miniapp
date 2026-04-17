import { useEffect, useMemo, useState } from "react";
import {
  getUserAds,
  getUserProfile,
  saveUserProfile,
  updateUserProfile,
  archiveAd,
  restoreAd,
  uploadImage,
} from "../firebase";

export default function ProfilePage({ user, onOpenAd }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [activeAds, setActiveAds] = useState([]);
  const [archivedAds, setArchivedAds] = useState([]);
  const [pendingAds, setPendingAds] = useState([]);
  const [rejectedAds, setRejectedAds] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    loadProfile();
  }, [user?.id]);

  const totalViews = useMemo(() => {
    return [...activeAds, ...archivedAds, ...pendingAds, ...rejectedAds].reduce(
      (sum, ad) => sum + (ad.views || 0),
      0
    );
  }, [activeAds, archivedAds, pendingAds, rejectedAds]);

  const loadProfile = async () => {
    if (!user?.id) return;

    let existing = await getUserProfile(user.id);

    if (!existing) {
      await saveUserProfile({
        userId: user.id,
        firstName: user.first_name || "",
        username: user.username || "",
        displayName: user.first_name || "Пользователь",
        avatarUrl: "",
        telegramAvatarUrl: "",
        bio: "",
        theme: "dark",
        createdAt: Date.now(),
      });

      existing = await getUserProfile(user.id);
    }

    setProfile(existing);
    setDisplayName(existing?.displayName || user.first_name || "");

    const [active, archived, pending, rejected] = await Promise.all([
      getUserAds(user.id, "approved"),
      getUserAds(user.id, "archived"),
      getUserAds(user.id, "pending"),
      getUserAds(user.id, "rejected"),
    ]);

    setActiveAds(active);
    setArchivedAds(archived);
    setPendingAds(pending);
    setRejectedAds(rejected);
  };

  const saveName = async () => {
    if (!user?.id) return;
    await updateUserProfile(user.id, { displayName });
    setMessage("✅ Имя сохранено");
    await loadProfile();
  };

  const handleUploadAvatar = async (file) => {
    if (!file || !user?.id) return;
    setMessage("Загрузка аватарки...");
    const avatarUrl = await uploadImage(file);
    await updateUserProfile(user.id, { avatarUrl });
    setMessage("✅ Аватарка обновлена");
    await loadProfile();
  };

  const handleArchive = async (adId) => {
    await archiveAd(adId);
    await loadProfile();
  };

  const handleRestore = async (adId) => {
    await restoreAd(adId);
    await loadProfile();
  };

  if (!user) {
    return (
      <div className="help-page page-enter">
        <div className="help-hero">
          <h2>Профиль недоступен</h2>
          <p>Открой приложение через Telegram, чтобы увидеть свой профиль.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="help-page page-enter">
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
              {profile?.displayName || user.first_name || "Пользователь"}
            </h2>
            <p style={{ marginTop: 8 }}>
              @{profile?.username || user.username || "no_username"}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Имя в профиле"
          />

          <button onClick={saveName}>Сохранить имя</button>

          <input
            type="file"
            onChange={(e) => handleUploadAvatar(e.target.files?.[0] || null)}
          />

          {!!message && <p>{message}</p>}
        </div>
      </div>

      <div className="help-card">
        <div className="help-card-title">Статистика</div>
        <p>Активных объявлений: {activeAds.length}</p>
        <p>На модерации: {pendingAds.length}</p>
        <p>Снятых с публикации: {archivedAds.length}</p>
        <p>Отклонённых: {rejectedAds.length}</p>
        <p>Всего просмотров: {totalViews}</p>
      </div>

      <div className="help-card">
        <div className="help-card-title">Активные объявления</div>
        {activeAds.length === 0 ? (
          <p>У тебя пока нет активных объявлений.</p>
        ) : (
          activeAds.map((ad) => (
            <div key={ad.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>{ad.title}</div>
              <p style={{ margin: "6px 0" }}>
                {ad.price} ₽ · просмотров: {ad.views || 0}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => onOpenAd(ad)}>Открыть</button>
                <button onClick={() => handleArchive(ad.id)}>Снять с публикации</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="help-card">
        <div className="help-card-title">Снятые объявления</div>
        {archivedAds.length === 0 ? (
          <p>Нет снятых объявлений.</p>
        ) : (
          archivedAds.map((ad) => (
            <div key={ad.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>{ad.title}</div>
              <p style={{ margin: "6px 0" }}>
                {ad.price} ₽ · просмотров: {ad.views || 0}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => onOpenAd(ad)}>Открыть</button>
                <button onClick={() => handleRestore(ad.id)}>Вернуть в публикацию</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="help-card">
        <div className="help-card-title">На модерации</div>
        {pendingAds.length === 0 ? (
          <p>Нет объявлений на модерации.</p>
        ) : (
          pendingAds.map((ad) => (
            <div key={ad.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>{ad.title}</div>
              <p style={{ margin: "6px 0" }}>{ad.price} ₽</p>
            </div>
          ))
        )}
      </div>

      <div className="help-card">
        <div className="help-card-title">Отклонённые</div>
        {rejectedAds.length === 0 ? (
          <p>Нет отклонённых объявлений.</p>
        ) : (
          rejectedAds.map((ad) => (
            <div key={ad.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>{ad.title}</div>
              <p style={{ margin: "6px 0" }}>{ad.price} ₽</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}