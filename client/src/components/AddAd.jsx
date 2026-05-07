import { useEffect, useMemo, useState } from "react";
import {
  getUserProfile,
  saveUserProfile,
} from "../firebase";
import { uploadImagesToCloudinary, getParallelUploadLimit } from "../cloudinary";
import { logDebugEvent } from "../debugLog";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORIES } from "../categories";

function normalizeImageUrls(ad) {
  if (!ad) return [];
  const urls = Array.isArray(ad.imageUrls) ? ad.imageUrls : [];
  const first = ad.imageUrl ? [ad.imageUrl] : [];
  return Array.from(new Set([...urls, ...first].filter(Boolean)));
}

function getEditModeCopy(mode, initialAd) {
  if (mode === "fix-rejected") {
    return {
      title: "Исправить объявление",
      submit: "Отправить на модерацию",
      loading: "Отправляем на повторную модерацию...",
      success: "✅ Объявление отправлено на повторную модерацию",
      note: "После исправления объявление снова проверит модератор",
    };
  }

  if (mode === "edit-active") {
    return {
      title: "Редактировать объявление",
      submit: "Сохранить и отправить на модерацию",
      loading: "Сохраняем изменения...",
      success: "✅ Изменения отправлены на модерацию",
      note: "После изменения активное объявление временно уйдёт на проверку",
    };
  }

  return {
    title: "Создание объявления",
    submit: "Отправить на модерацию",
    loading: "Отправляем...",
    success: "✅ Отправлено на модерацию",
    note: "Объявление будет проверено модератором",
  };
}

export default function AddAd({ user, onBack, initialAd = null, mode = "create", onSubmitSuccess }) {
  const isEditMode = Boolean(initialAd?.id) && mode !== "create";
  const modeCopy = useMemo(() => getEditModeCopy(mode, initialAd), [mode, initialAd]);

  const [images, setImages] = useState([]);
  const [existingImageUrls, setExistingImageUrls] = useState(() => normalizeImageUrls(initialAd));
  const [title, setTitle] = useState(initialAd?.title || "");
  const [price, setPrice] = useState(initialAd?.price ? String(initialAd.price).replace(/[^0-9]/g, "") : "");
  const [description, setDescription] = useState(initialAd?.description || "");
  const [category, setCategory] = useState(initialAd?.category || "");
  const [message, setMessage] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!initialAd?.id) return;

    setTitle(initialAd.title || "");
    setPrice(initialAd.price ? String(initialAd.price).replace(/[^0-9]/g, "") : "");
    setDescription(initialAd.description || "");
    setCategory(initialAd.category || "");
    setExistingImageUrls(normalizeImageUrls(initialAd));
    setImages([]);
    setMessage("");
  }, [initialAd?.id]);

  useEffect(() => {
    const previews = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);

    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const totalImageCount = existingImageUrls.length + images.length;
  const previewUrls = [...existingImageUrls, ...imagePreviews];

  const handleFileChange = (files) => {
    const selected = Array.from(files || []);
    const remainingSlots = Math.max(0, 10 - existingImageUrls.length);
    setImages(selected.slice(0, remainingSlots));
  };

  const removeExistingImage = (url) => {
    setExistingImageUrls((prev) => prev.filter((item) => item !== url));
  };

  const removeNewImage = (index) => {
    setImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const notifyModeration = (payload) => {
    const apiBase =
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_SERVER_URL ||
      "https://miniapp-1wzi.onrender.com";

    window.setTimeout(() => {
      fetch(`${apiBase}/new-ad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          const text = await response.text();
          let result = {};
          try {
            result = JSON.parse(text);
          } catch {
            result = { ok: false, error: text };
          }

          if (!response.ok || !result.ok) {
            throw new Error(result.error || "Сервер не принял объявление");
          }

          logDebugEvent("ad_submit_moderation_notify_success", { id: payload.id });
        })
        .catch((error) => {
          console.warn("Не удалось отправить уведомление модератору:", error);
          logDebugEvent("ad_submit_moderation_notify_error", error);
        });
    }, 0);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    logDebugEvent(isEditMode ? "ad_resubmit_start" : "ad_submit_start", {
      imageCount: totalImageCount,
      mode,
      adId: initialAd?.id || null,
    });

    const tg = window.Telegram?.WebApp;
    let realUser = user || tg?.initDataUnsafe?.user || null;

    if (!realUser) {
      setMessage("⏳ Получаем данные пользователя...");
      await new Promise((resolve) => setTimeout(resolve, 800));
      realUser = user || tg?.initDataUnsafe?.user || null;
    }

    if (!realUser) {
      setMessage("⚠️ Не удалось получить данные пользователя. Попробуй ещё раз");
      setIsSubmitting(false);
      return;
    }

    const missing = [];
    if (!title.trim()) missing.push("Название");
    if (!price) missing.push("Цена");
    if (!description.trim()) missing.push("Описание");
    if (!category) missing.push("Категория");
    if (!totalImageCount) missing.push("Изображение");

    if (missing.length > 0) {
      setMessage("Заполните: " + missing.join(", "));
      setIsSubmitting(false);
      return;
    }

    const id = isEditMode ? String(initialAd.id) : Date.now().toString();

    try {
      setMessage("Подготавливаем профиль...");

      let profile = await getUserProfile(realUser.id);

      if (!profile) {
        await saveUserProfile({
          userId: realUser.id,
          firstName: realUser.first_name || "",
          username: realUser.username || "",
          displayName: realUser.first_name || "Пользователь",
          avatarUrl: "",
          telegramAvatarUrl: "",
          bio: "",
          theme: "dark",
          createdAt: Date.now(),
        });

        profile = await getUserProfile(realUser.id);
      }

      let uploadedImageUrls = [];
      if (images.length > 0) {
        const parallelLimit = getParallelUploadLimit();
        setMessage(`Сжимаем и загружаем фото 0/${images.length}...`);
        logDebugEvent("ad_submit_images_upload_start", {
          total: images.length,
          parallelLimit,
        });

        uploadedImageUrls = await uploadImagesToCloudinary(images, {
          concurrency: parallelLimit,
          onProgress: ({ completed, total }) => {
            setMessage(`Загрузка фото ${completed}/${total}...`);
            logDebugEvent("ad_submit_images_upload_progress", { completed, total });
          },
        });

        logDebugEvent("ad_submit_images_upload_success", { total: uploadedImageUrls.length });
      }

      const imageUrls = [...existingImageUrls, ...uploadedImageUrls];

      const sellerDisplayName =
        profile?.displayName ||
        realUser.first_name ||
        realUser.username ||
        "Пользователь";

      const sellerAvatarUrl =
        profile?.avatarUrl ||
        profile?.vkAvatarUrl ||
        profile?.telegramAvatarUrl ||
        "";

      setMessage(isEditMode ? modeCopy.loading : "Сохраняем объявление...");

      const now = Date.now();
      const payload = {
        id,
        title: title.trim(),
        price,
        description: description.trim(),
        category,
        imageUrls,
        imageUrl: imageUrls[0],
        status: "pending",
        moderationStatus: "pending",
        moderationMode: isEditMode ? mode : "create",
        updatedAt: now,
        resubmittedAt: isEditMode ? now : null,
        rejectionReason: "",
        moderationRejectReason: "",
        rejectedAt: null,
        userId: realUser.id,
        username: realUser.username || initialAd?.username || null,
        firstName: realUser.first_name || initialAd?.firstName || "Гость",
        sellerDisplayName,
        sellerAvatarUrl,
      };

      if (!isEditMode) {
        payload.createdAt = now;
        payload.views = 0;
      } else {
        payload.createdAt = initialAd.createdAt || now;
        payload.views = Number(initialAd.views || 0);
        payload.previousStatus = initialAd.status || null;
        payload.wasApprovedBeforeEdit = initialAd.status === "approved" || mode === "edit-active";
      }

      await setDoc(doc(db, "ads", id), payload, { merge: true });

      setMessage(modeCopy.success);
      logDebugEvent(isEditMode ? "ad_resubmit_firestore_saved" : "ad_submit_firestore_saved", {
        id,
        imageCount: imageUrls.length,
        mode,
      });

      notifyModeration({
        ...payload,
        moderationMode: isEditMode ? mode : "create",
      });

      if (isEditMode) {
        window.setTimeout(() => {
          onSubmitSuccess?.(id, payload);
        }, 750);
      } else {
        setTitle("");
        setPrice("");
        setDescription("");
        setCategory("");
        setImages([]);
        setExistingImageUrls([]);
        onSubmitSuccess?.(id, payload);
      }
    } catch (err) {
      console.error(err);
      logDebugEvent(isEditMode ? "ad_resubmit_error" : "ad_submit_error", err);
      setMessage(`❌ Ошибка отправки: ${err?.message || "попробуй ещё раз"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-premium-page page-enter">
      <div className="create-premium-topbar">
        <button
          type="button"
          className="create-top-action create-back-action"
          onClick={onBack}
          aria-label="Назад"
        >
          <svg viewBox="0 0 612 612" aria-hidden="true" focusable="false">
            <path d="M497.25 497.25c0 21.114-17.117 38.25-38.25 38.25H76.5c-21.133 0-38.25-17.136-38.25-38.25v-382.5c0-21.133 17.117-38.25 38.25-38.25H459c21.133 0 38.25 17.117 38.25 38.25v57.375h38.25V114.75c0-42.247-34.253-76.5-76.5-76.5H76.5C34.253 38.25 0 72.503 0 114.75v382.5c0 42.247 34.253 76.5 76.5 76.5H459c42.247 0 76.5-34.253 76.5-76.5v-57.375h-38.25v57.375zM592.875 286.875H180.043l100.272-100.272c7.478-7.458 7.478-19.584 0-27.042-7.478-7.478-19.584-7.478-27.042 0L121.329 291.522c-3.997 3.978-5.699 9.256-5.432 14.478-.268 5.221 1.435 10.5 5.413 14.478l131.943 131.943c7.458 7.478 19.584 7.478 27.042 0 7.478-7.459 7.478-19.584 0-27.043L180.043 325.125h412.832c10.557 0 19.125-8.568 19.125-19.125 0-10.557-8.568-19.125-19.125-19.125z" />
          </svg>
        </button>

        <div className="create-premium-title">
          <h1>{modeCopy.title}</h1>
          {isEditMode && (
            <p className="create-edit-subtitle">{initialAd?.title}</p>
          )}
        </div>

        <div className="create-top-spacer" aria-hidden="true" />
      </div>

      {isEditMode && (initialAd?.rejectionReason || initialAd?.moderationRejectReason) && (
        <div className="create-edit-warning">
          <strong>Причина отклонения</strong>
          <span>{initialAd.rejectionReason || initialAd.moderationRejectReason}</span>
        </div>
      )}

      <div className="create-steps-stack">
        <section className="create-step-card create-photo-step">
          <div className="create-step-head">
            <div className="create-step-title">1. Фото</div>
            <div className="create-counter">{totalImageCount}/10</div>
          </div>

          <div className="create-photo-row">
            <label className="create-photo-upload">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <span className="create-photo-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M8.5 7.5L9.7 5.8C10.1 5.3 10.6 5 11.3 5H12.7C13.4 5 13.9 5.3 14.3 5.8L15.5 7.5" />
                  <rect x="4" y="7.5" width="16" height="11" rx="3" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
              <span>{isEditMode ? "Добавить ещё" : "Добавить фото"}</span>
            </label>

            {Array.from({ length: 3 }).map((_, index) => {
              const preview = previewUrls[index];
              const isExisting = index < existingImageUrls.length;
              const newImageIndex = index - existingImageUrls.length;
              return (
                <div key={index} className={`create-photo-slot ${preview ? "filled" : ""}`}>
                  {preview && <img src={preview} alt={`Фото ${index + 1}`} />}
                  {preview && (
                    <button
                      type="button"
                      className="create-photo-remove"
                      onClick={() => isExisting ? removeExistingImage(preview) : removeNewImage(newImageIndex)}
                      aria-label="Удалить фото"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="create-step-note">
            {isEditMode
              ? "Можно оставить текущие фото, удалить лишние или добавить новые. Минимум одно фото обязательно."
              : "Добавьте от 1 до 10 фото. Хорошие фото увеличивают шансы на быструю продажу."}
          </p>
        </section>

        <section className="create-step-card">
          <div className="create-step-title">2. Название</div>
          <div className="create-input-wrap">
            <input
              placeholder="Введите название объявления"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
            />
            <span className="create-field-counter">{title.length}/60</span>
          </div>
        </section>

        <section className="create-step-card">
          <div className="create-step-title">3. Цена</div>
          <div className="create-input-wrap">
            <input
              inputMode="numeric"
              placeholder="Введите цену"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <span className="create-ruble">₽</span>
          </div>
          <p className="create-step-note small">Укажите стоимость товара</p>
        </section>

        <section className="create-step-card">
          <div className="create-step-title">4. Описание</div>
          <div className="create-textarea-wrap">
            <textarea
              placeholder="Подробно опишите товар: состояние, характеристики, причину продажи и т.д."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
            <span className="create-field-counter textarea-counter">{description.length}/1000</span>
          </div>
        </section>

        <section className="create-step-card">
          <div className="create-step-title">5. Категория</div>
          <button
            type="button"
            className={`create-category-trigger ${category ? "selected" : ""}`}
            onClick={() => setShowCategoryPicker(true)}
          >
            <span>{category || "Выберите категорию"}</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6L15 12L9 18" />
            </svg>
          </button>
        </section>
      </div>

      <button className="create-submit-premium" onClick={handleSubmit} disabled={isSubmitting}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 4L10 15" />
          <path d="M21 4L14 21L10 15L3 11L21 4Z" />
        </svg>
        <span>{isSubmitting ? modeCopy.loading : modeCopy.submit}</span>
      </button>

      <div className="create-moderation-note">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="6" y="10" width="12" height="10" rx="2" />
          <path d="M9 10V7.8C9 6.1 10.3 5 12 5C13.7 5 15 6.1 15 7.8V10" />
        </svg>
        <span>{modeCopy.note}</span>
      </div>

      {!!message && <p className="create-message">{message}</p>}

      {showCategoryPicker && (
        <div className="ios-sheet-backdrop" onClick={() => setShowCategoryPicker(false)}>
          <div className="ios-sheet-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-card">
              <div className="ios-sheet-header">
                <div className="ios-sheet-title">Выберите категорию</div>
                <div className="ios-sheet-subtitle">
                  Категория будет показана в объявлении и фильтрах
                </div>
              </div>

              <div className="ios-sheet-list">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`ios-sheet-option ${category === item ? "active" : ""}`}
                    onClick={() => {
                      setCategory(item);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <span>{item}</span>

                    {category === item && (
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

            <button
              type="button"
              className="ios-sheet-cancel"
              onClick={() => setShowCategoryPicker(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
