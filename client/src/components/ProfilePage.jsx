import { useEffect, useMemo, useRef, useState } from "react";
import {
  getUserProfileBundle,
  updateUserProfile,
  uploadImage,
} from "../firebase";
import { getAvatarImageUrl } from "../cloudinary";
import { logoutAuthSession } from "../auth";
import { isVkMiniAppLaunch } from "../vkMiniApp";

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

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9.4 5.2H6.8C5.8 5.2 5 6 5 7V17C5 18 5.8 18.8 6.8 18.8H9.4" />
      <path d="M13 8.2L16.8 12L13 15.8" />
      <path d="M16.6 12H9" />
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

  if (type === "favorite") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 20.2C9.8 18.35 7.95 16.7 6.4 15.05C4.85 13.4 4 11.78 4 9.9C4 7.85 5.55 6.3 7.6 6.3C8.78 6.3 9.95 6.85 10.7 7.75L12 9.3L13.3 7.75C14.05 6.85 15.22 6.3 16.4 6.3C18.45 6.3 20 7.85 20 9.9C20 11.78 19.15 13.4 17.6 15.05C16.05 16.7 14.2 18.35 12 20.2Z" />
      </svg>
    );
  }

  if (type === "chat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 6.8C5 5.25 6.25 4 7.8 4H16.2C17.75 4 19 5.25 19 6.8V12.2C19 13.75 17.75 15 16.2 15H11L7 18.5V15H7.8C6.25 15 5 13.75 5 12.2V6.8Z" />
        <path d="M8.5 8.5H15.5" />
        <path d="M8.5 11.2H13.5" />
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

const PROFILE_CACHE_PREFIX = "baraholka_profile_bundle_v1";

function readProfileCache(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PROFILE_CACHE_PREFIX}_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeProfileCache(userId, value) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PROFILE_CACHE_PREFIX}_${userId}`, JSON.stringify(value));
  } catch {
    // ignore cache errors
  }
}

export default function ProfilePage({
  user,
  onOpenSection,
  onOpenChats,
  initialProfileData,
  onProfileDataLoaded,
  onLogoutComplete,
}) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [activeAds, setActiveAds] = useState([]);
  const [archivedAds, setArchivedAds] = useState([]);
  const [pendingAds, setPendingAds] = useState([]);
  const [rejectedAds, setRejectedAds] = useState([]);
  const [favoriteAds, setFavoriteAds] = useState([]);
  const [message, setMessage] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(!initialProfileData);
  const [nameTouched, setNameTouched] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });

    if (initialProfileData?.profile) {
      applyProfileData(initialProfileData);
    }

    loadProfile();
  }, [user?.id]);

  const profileCounters = profile?.profileCounters || {};
  const activeCount = Number(profileCounters.active ?? activeAds.length);
  const archivedCount = Number(profileCounters.archived ?? archivedAds.length);
  const pendingCount = Number(profileCounters.pending ?? pendingAds.length);
  const rejectedCount = Number(profileCounters.rejected ?? rejectedAds.length);
  const favoriteCount = Number(profileCounters.favorites ?? favoriteAds.length);

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

  const applyProfileData = (data) => {
    if (!data) return;

    setProfile(data.profile || null);
    setDisplayName(data.profile?.displayName || user?.first_name || "");
    setNameTouched(false);
    setActiveAds(Array.isArray(data.activeAds) ? data.activeAds : []);
    setArchivedAds(Array.isArray(data.archivedAds) ? data.archivedAds : []);
    setPendingAds(Array.isArray(data.pendingAds) ? data.pendingAds : []);
    setRejectedAds(Array.isArray(data.rejectedAds) ? data.rejectedAds : []);
    setFavoriteAds(Array.isArray(data.favoriteAds) ? data.favoriteAds : []);
  };

  const loadProfile = async () => {
    if (!user?.id) return;

    const cached = readProfileCache(user.id);
    if (cached && !initialProfileData?.profile) {
      applyProfileData(cached);
      setIsProfileLoading(false);
    } else {
      setIsProfileLoading(!initialProfileData?.profile);
    }

    try {
      const data = await getUserProfileBundle(user);
      applyProfileData(data);
      writeProfileCache(user.id, data);
      onProfileDataLoaded?.(data);
    } catch (error) {
      console.error("Ошибка загрузки профиля:", error);
      setMessage("Не удалось обновить профиль. Попробуй открыть раздел ещё раз.");
    } finally {
      setIsProfileLoading(false);
    }
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

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      setMessage("Выходим из аккаунта...");

      await logoutAuthSession();

      try {
        if (user?.id) {
          window.localStorage.removeItem(`${PROFILE_CACHE_PREFIX}_${user.id}`);
        }
        window.localStorage.removeItem("baraholka_user");
        window.localStorage.removeItem("baraholka_profile");
        window.localStorage.removeItem("baraholka_auth_user");
        window.localStorage.removeItem("baraholka_auth_session");
        window.localStorage.removeItem("baraholka_auth_session_v1");
      } catch {
        // ignore storage errors
      }

      try {
        window.sessionStorage.removeItem("app_page");
        window.sessionStorage.removeItem("selected_ad");
        window.sessionStorage.removeItem("selected_ad_id");
        window.sessionStorage.removeItem("selected_chat_id");
        window.sessionStorage.removeItem("selected_seller_id");
        window.sessionStorage.removeItem("profile_status_page");
        window.sessionStorage.removeItem("seller_back_target");
        window.sessionStorage.removeItem("view_back_target");
      } catch {
        // ignore storage errors
      }

      onLogoutComplete?.();
    } catch (error) {
      console.error("Ошибка выхода из аккаунта:", error);
      setMessage("Сессия на устройстве сброшена. Обновляем профиль...");
      onLogoutComplete?.();
    } finally {
      setIsLoggingOut(false);
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
          <p>Откройте сервис через поддерживаемое мини-приложение, чтобы увидеть свой профиль.</p>
        </div>
      </div>
    );
  }

  if (isProfileLoading && !profile) {
    return (
      <div className="profile-premium-page page-enter">
        <section className="profile-owner-card profile-owner-card-loading">
          <div className="profile-loading-avatar" />
          <div className="profile-loading-lines">
            <span />
            <span />
            <span />
          </div>
        </section>
        <section className="profile-edit-card profile-loading-card">
          <div className="profile-loading-wide" />
          <div className="profile-loading-wide short" />
        </section>
      </div>
    );
  }

  const isVkProfile = profile?.authProvider === "vk" || user?.authProvider === "vk" || Boolean(profile?.vkId);
  const isTelegramMiniApp =
    typeof window !== "undefined" && Boolean(window.Telegram?.WebApp?.initData);
  const canLogout = !isTelegramMiniApp && !isVkMiniAppLaunch();
  const phoneVerificationRequired = profile?.phoneVerificationRequired !== false && !isVkProfile;
  const avatarUrl = getAvatarImageUrl(
    profile?.avatarUrl ||
      profile?.vkAvatarUrl ||
      profile?.telegramAvatarUrl ||
      user?.photo_url ||
      ""
  );
  const profileName = profile?.displayName || user.first_name || "Пользователь";
  const username =
    profile?.username ||
    profile?.vkDomain ||
    user.username ||
    (profile?.vkId ? `id${profile.vkId}` : "no_username");
  const isVerified = !!profile?.isVerified || !!profile?.identityVerified || isVkProfile;

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
              <span>{isVerified ? (isVkProfile ? "Профиль подтвержден через VK" : "Профиль подтвержден") : "Профиль не подтвержден"}</span>
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

        {!isVerified && phoneVerificationRequired && (
          <div className="profile-action-row-premium profile-action-row-single">
            <button type="button" className="profile-verify-action" onClick={handleVerifyPhone}>
              <span className="profile-action-icon">
                <VerifiedIcon />
              </span>
              Подтвердить номер
            </button>
          </div>
        )}

        {!!message && <div className="profile-message">{message}</div>}
      </section>

      <section className="profile-menu-section">
        <div className="profile-menu-label">МОЙ РАЗДЕЛ</div>
<button className="profile-menu-tile accent-pink profile-favorites-tile" onClick={() => onOpenSection("favorites")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="favorite" /></span>
          <span className="profile-menu-copy">
            <strong>Избранное</strong>
            <span>{favoriteCount} сохранённых объявлений</span>
          </span>
          <span className="profile-menu-arrow">›</span>
        </button>
      </section>

      <section className="profile-menu-section">
        <div className="profile-menu-label">МОИ ОБЪЯВЛЕНИЯ</div>

        <button className="profile-menu-tile accent-cyan" onClick={() => onOpenSection("approved")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="active" /></span>
          <span className="profile-menu-copy">
            <strong>Активные</strong>
            <span>{activeCount} объявлений опубликовано</span>
          </span>
          <span className="profile-menu-arrow">›</span>
        </button>

        <button className="profile-menu-tile accent-gold" onClick={() => onOpenSection("pending")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="pending" /></span>
          <span className="profile-menu-copy">
            <strong>На модерации</strong>
            <span>{pendingCount} ожидают проверки</span>
          </span>
          <span className="profile-menu-arrow">›</span>
        </button>

        <button className="profile-menu-tile accent-mint" onClick={() => onOpenSection("archived")}>
          <span className="profile-menu-icon"><ProfileTileIcon type="archive" /></span>
          <span className="profile-menu-copy">
            <strong>Архив</strong>
            <span>{archivedCount} объявлений в архиве</span>
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


        {canLogout && (
          <button
            type="button"
            className="profile-menu-tile profile-logout-tile"
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{
              marginTop: "18px",
              borderColor: "rgba(255, 82, 82, 0.42)",
              background:
                "linear-gradient(135deg, rgba(255, 60, 60, 0.18), rgba(255, 60, 60, 0.08))",
              boxShadow: "0 18px 42px rgba(255, 42, 42, 0.12)",
              opacity: isLoggingOut ? 0.72 : 1,
            }}
          >
            <span
              className="profile-menu-icon"
              style={{
                color: "#ff6b6b",
                background: "rgba(255, 80, 80, 0.16)",
                borderColor: "rgba(255, 92, 92, 0.28)",
              }}
            >
              <LogoutIcon />
            </span>
            <span className="profile-menu-copy">
              <strong style={{ color: "#ff7a7a" }}>
                {isLoggingOut ? "Выходим..." : "Выйти из аккаунта"}
              </strong>
              <span>Завершить текущую сессию</span>
            </span>
            <span className="profile-menu-arrow" style={{ color: "rgba(255, 122, 122, 0.9)" }}>›</span>
          </button>
        )}
      </section>
    </div>
  );
}
