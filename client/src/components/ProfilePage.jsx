import { useEffect, useMemo, useRef, useState } from "react";
import {
  getUserAds,
  getUserProfile,
  saveUserProfile,
  updateUserProfile,
  uploadImage,
} from "../firebase";

function UserPlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5.5 18.2C6.8 15.5 9.1 14.2 12 14.2C14.9 14.2 17.2 15.5 18.5 18.2" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.4L18.6 6.2V11.2C18.6 15.4 16.05 19.1 12 20.6C7.95 19.1 5.4 15.4 5.4 11.2V6.2L12 3.4Z" />
      <path d="M8.7 12.1L10.9 14.2L15.6 9.5" />
    </svg>
  );
}

function ProfileTileIcon({ type }) {
  if (type === "active") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="4.5" width="14" height="15" rx="3.5" />
        <path d="M8.5 9.3H15.5" />
        <path d="M8.5 13H13.5" />
      </svg>
    );
  }

  if (type === "pending") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 8V12.5L15 14" />
      </svg>
    );
  }

  if (type === "archive") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 8H19" />
        <path d="M7 8V18.2C7 19.2 7.8 20 8.8 20H15.2C16.2 20 17 19.2 17 18.2V8" />
        <path d="M8 5H16L17 8H7L8 5Z" />
        <path d="M10 12H14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M9 9L15 15" />
      <path d="M15 9L9 15" />
    </svg>
  );
}

export default function ProfilePage({ user, onOpenSection }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [activeAds, setActiveAds] = useState([]);
  const [archivedAds, setArchivedAds] = useState([]);
  const [pendingAds, setPendingAds] = useState([]);
  const [rejectedAds, setRejectedAds] = useState([]);
  const [message, setMessage] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const fileInputRef = useRef(null);

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
    nameTouched &&
    normalizedInputName.length > 0 &&
    normalizedInputName !== normalizedCurrentName;

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
    setNameTouched(false);

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
    setMessage("Имя профиля сохранено");
    await loadProfile();
    setNameTouched(false);
  };

  const handleUploadAvatar = async (file) => {
    if (!file || !user?.id) return;

    try {
      setMessage("Загружаем новую аватарку...");
      const avatarUrl = await uploadImage(file);
      await updateUserProfile(user.id, { avatarUrl });
      setMessage("Аватарка обновлена");
      await loadProfile();
    } catch (error) {
      console.error(error);
      setMessage("Не удалось обновить аватарку");
    }
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
        setMessage("Бот отправил сообщение для подтверждения номера");
      } else {
        setMessage("Не удалось начать подтверждение");
      }
    } catch (error) {
      console.error(error);
      setMessage("Ошибка запроса подтверждения");
    }
  };

  if (!user) {
    return (
      <div className="profile-premium-page page-enter">
        <div className="profile-empty-card">
          <div className="profile-empty-icon">
            <UserPlaceholderIcon />
          </div>
          <h2>Профиль недоступен</h2>
          <p>Открой приложение через Telegram, чтобы увидеть свой профиль.</p>
        </div>
      </div>
    );
  }

  const avatarUrl = profile?.avatarUrl || profile?.telegramAvatarUrl || "";
  const profileName = profile?.displayName || user.first_name || "Пользователь";
  const username = profile?.username || user.username || "no_username";
  const isVerified = !!profile?.isVerified;

  return (
    <div className="profile-premium-page page-enter">
      <section className="profile-owner-card">
        <div className="profile-owner-main">
          <button
            type="button"
            className="profile-owner-avatar"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Изменить аватарку"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="profile-owner-avatar-img" />
            ) : (
              <div className="profile-owner-avatar-placeholder">
                <UserPlaceholderIcon />
              </div>
            )}
            <span className="profile-avatar-edit-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 7V17" />
                <path d="M7 12H17" />
              </svg>
            </span>
          </button>

          <input
            ref={fileInputRef}
            className="profile-hidden-file"
            type="file"
            accept="image/*"
            onChange={(e) => handleUploadAvatar(e.target.files?.[0] || null)}
          />

          <div className="profile-owner-info">
            <h1>{profileName}</h1>
            <div className="profile-rating-row">
              <span className="profile-star" aria-hidden="true">★</span>
              <span>5.0</span>
              <span className="profile-dot">•</span>
              <span>0 отзывов</span>
            </div>

            <div className={isVerified ? "profile-status-pill verified" : "profile-status-pill unverified"}>
              {isVerified && <VerifiedIcon />}
              {!isVerified && <span className="profile-status-dot" />}
              <span>{isVerified ? "Профиль подтвержден" : "Профиль не подтвержден"}</span>
            </div>
          </div>
        </div>

        <div className="profile-owner-stats">
          <button type="button" onClick={() => onOpenSection("approved")}>
            <strong>{activeAds.length}</strong>
            <span>Активных</span>
          </button>
          <div className="profile-stat-divider" />
          <button type="button" onClick={() => onOpenSection("archived")}>
            <strong>{archivedAds.length}</strong>
            <span>Продано</span>
          </button>
        </div>
      </section>

      <section className="profile-edit-card">
        <div className="profile-section-heading">
          <div>
            <h2>Мой профиль</h2>
            <p>@{username}</p>
          </div>
          <div className="profile-views-pill">{totalViews} просмотров</div>
        </div>

        <label className="profile-field-label" htmlFor="profile-display-name">
          Имя в профиле
        </label>
        <div className="profile-name-control">
          <input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setNameTouched(true);
            }}
            placeholder="Имя в профиле"
          />
          {hasNameChanges && (
            <button type="button" onClick={saveName}>
              Сохранить
            </button>
          )}
        </div>

        <div className="profile-action-row-premium">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <span className="profile-action-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M8 8.5L10 5.5H14L16 8.5" />
                <rect x="4.5" y="8.5" width="15" height="10" rx="3" />
                <circle cx="12" cy="13.5" r="2.7" />
              </svg>
            </span>
            Обновить фото
          </button>

          {!isVerified && (
            <button type="button" className="profile-verify-action" onClick={handleVerifyPhone}>
              <span className="profile-action-icon">
                <VerifiedIcon />
              </span>
              Подтвердить номер
            </button>
          )}
        </div>

        {!!message && <div className="profile-message">{message}</div>}
      </section>

      <section className="profile-menu-section">
        <div className="profile-menu-label">МОИ ОБЪЯВЛЕНИЯ</div>

        <button className="profile-menu-tile accent-cyan" onClick={() => onOpenSection("approved")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="active" /></span>
          <span className="profile-menu-copy">
            <strong>Активные</strong>
            <span>{activeAds.length} объявлений опубликовано</span>
          </span>
          <span className="profile-menu-arrow">›</span>
        </button>

        <button className="profile-menu-tile accent-gold" onClick={() => onOpenSection("pending")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="pending" /></span>
          <span className="profile-menu-copy">
            <strong>На модерации</strong>
            <span>{pendingAds.length} ожидают проверки</span>
          </span>
          <span className="profile-menu-arrow">›</span>
        </button>

        <button className="profile-menu-tile accent-mint" onClick={() => onOpenSection("archived")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="archive" /></span>
          <span className="profile-menu-copy">
            <strong>Архив</strong>
            <span>{archivedAds.length} объявлений в архиве</span>
          </span>
          <span className="profile-menu-arrow">›</span>
        </button>

        <button className="profile-menu-tile accent-pink" onClick={() => onOpenSection("rejected")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="rejected" /></span>
          <span className="profile-menu-copy">
            <strong>Отклонённые</strong>
            <span>{rejectedAds.length} нужно исправить</span>
          </span>
          <span className="profile-menu-arrow">›</span>
        </button>
      </section>
    </div>
  );
}
