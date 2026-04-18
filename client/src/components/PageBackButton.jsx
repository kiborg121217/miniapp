import { useEffect, useMemo, useState } from "react";
import {
  getUserAds,
  getUserProfile,
  saveUserProfile,
  updateUserProfile,
  uploadImage,
} from "../firebase";

export default function ProfilePage({ user, onOpenSection }) {
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

  const normalizedCurrentName = (profile?.displayName || user?.first_name || "").trim();
  const normalizedInputName = displayName.trim();
  const hasNameChanges =
    normalizedInputName.length > 0 && normalizedInputName !== normalizedCurrentName;

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
        isVerified: false,
        verifiedAt: null,
        phoneNumber: "",
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
    if (!user?.id || !hasNameChanges) return;
    await updateUserProfile(user.id, { displayName: normalizedInputName });
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

  const handleVerifyPhone = async () => {
    if (!user?.id) return;

    try {
      setMessage("Отправляем запрос в Telegram...");

      const response = await fetch(
        "https://miniapp-1wzi.onrender.com/request-phone-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        setMessage("✅ Бот отправил сообщение для подтверждения номера");
      } else {
        setMessage("❌ Не удалось начать подтверждение");
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Ошибка запроса подтверждения");
    }
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
        <div className="profile-top">
          <div className="profile-avatar">
            {(profile?.avatarUrl || profile?.telegramAvatarUrl) ? (
              <img
                src={profile.avatarUrl || profile.telegramAvatarUrl}
                alt="avatar"
                className="profile-avatar-img"
              />
            ) : null}
          </div>

          <div className="profile-top-text">
            <h2>{profile?.displayName || user.first_name || "Пользователь"}</h2>
            <p>@{profile?.username || user.username || "no_username"}</p>

            {profile?.isVerified ? (
              <div className="verified-badge">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12.5L10.8 15.2L16.5 9.5" />
                </svg>
                <span>Проверенный профиль</span>
              </div>
            ) : (
              <div className="unverified-badge">
                <span>Профиль не подтвержден</span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-edit-grid">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Имя в профиле"
          />

          <div className="profile-actions-row">
            {hasNameChanges && (
              <button className="profile-action-btn save-name-btn" onClick={saveName}>
                Сохранить имя
              </button>
            )}

            {!profile?.isVerified && (
              <button className="profile-action-btn verify-phone-btn" onClick={handleVerifyPhone}>
                Подтвердить номер
              </button>
            )}
          </div>

          <input
            type="file"
            onChange={(e) => handleUploadAvatar(e.target.files?.[0] || null)}
          />

          {!!message && <p>{message}</p>}
        </div>
      </div>

      <div className="help-card">
        <div className="help-card-title">Статистика</div>
        <p>Всего просмотров: {totalViews}</p>
      </div>

      <div className="profile-section-grid">
        <button className="settings-tile" onClick={() => onOpenSection("approved")}>
          <div className="settings-tile-title">Активные</div>
          <div className="settings-tile-sub">{activeAds.length} объявлений</div>
        </button>

        <button className="settings-tile" onClick={() => onOpenSection("pending")}>
          <div className="settings-tile-title">На модерации</div>
          <div className="settings-tile-sub">{pendingAds.length} объявлений</div>
        </button>

        <button className="settings-tile" onClick={() => onOpenSection("archived")}>
          <div className="settings-tile-title">Архив</div>
          <div className="settings-tile-sub">{archivedAds.length} объявлений</div>
        </button>

        <button className="settings-tile" onClick={() => onOpenSection("rejected")}>
          <div className="settings-tile-title">Отклонённые</div>
          <div className="settings-tile-sub">{rejectedAds.length} объявлений</div>
        </button>
      </div>
    </div>
  );
}