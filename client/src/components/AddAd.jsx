import { useEffect, useState } from "react";
import {
  uploadImage,
  getUserProfile,
  saveUserProfile,
} from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORIES } from "../categories";

export default function AddAd({ user, onBack }) {
  const [images, setImages] = useState([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const previews = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);

    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleSubmit = async () => {
    const tg = window.Telegram?.WebApp;
    let realUser = user || tg?.initDataUnsafe?.user || null;

    if (!realUser) {
      setMessage("⏳ Получаем данные Telegram...");
      await new Promise((resolve) => setTimeout(resolve, 800));
      realUser = tg?.initDataUnsafe?.user || null;
    }

    if (!realUser) {
      setMessage("⚠️ Не удалось получить Telegram данные. Попробуй ещё раз");
      return;
    }

    const missing = [];
    if (!title) missing.push("Название");
    if (!price) missing.push("Цена");
    if (!description) missing.push("Описание");
    if (!category) missing.push("Категория");
    if (!images.length) missing.push("Изображение");

    if (missing.length > 0) {
      setMessage("Заполните: " + missing.join(", "));
      return;
    }

    const id = Date.now().toString();

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

      setMessage("Загрузка фото...");

      const imageUrls = [];
      for (const file of images) {
        const uploaded = await uploadImage(file);
        imageUrls.push(uploaded);
      }

      const sellerDisplayName =
        profile?.displayName ||
        realUser.first_name ||
        realUser.username ||
        "Пользователь";

      const sellerAvatarUrl =
        profile?.avatarUrl ||
        profile?.telegramAvatarUrl ||
        "";

      await setDoc(doc(db, "ads", id), {
        id,
        title,
        price,
        description,
        category,
        imageUrls,
        imageUrl: imageUrls[0],
        status: "pending",
        createdAt: Date.now(),
        views: 0,
        userId: realUser.id,
        username: realUser.username || null,
        firstName: realUser.first_name || "Гость",
        sellerDisplayName,
        sellerAvatarUrl,
      });

      const response = await fetch("https://miniapp-1wzi.onrender.com/new-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          price,
          description,
          category,
          imageUrls,
          imageUrl: imageUrls[0],
          userId: realUser.id,
        }),
      });

      const text = await response.text();

      let result = {};
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Сервер вернул не JSON: " + text);
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Сервер не принял объявление");
      }

      setTitle("");
      setPrice("");
      setDescription("");
      setCategory("");
      setImages([]);
      setMessage("✅ Отправлено на модерацию");
    } catch (err) {
      console.error(err);
      setMessage("❌ Ошибка отправки в модерацию");
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
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M14.5 6.5L9 12l5.5 5.5" />
          </svg>
        </button>

        <div className="create-premium-title">
          <h1>Создание объявления</h1>
        </div>

        <button
          type="button"
          className="create-top-action create-close-action"
          onClick={onBack}
          aria-label="Закрыть"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 7L17 17" />
            <path d="M17 7L7 17" />
          </svg>
        </button>
      </div>

      <div className="create-steps-stack">
        <section className="create-step-card create-photo-step">
          <div className="create-step-head">
            <div className="create-step-title">1. Фото</div>
            <div className="create-counter">{images.length}/10</div>
          </div>

          <div className="create-photo-row">
            <label className="create-photo-upload">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 10))}
              />
              <span className="create-photo-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M8.5 7.5L9.7 5.8C10.1 5.3 10.6 5 11.3 5H12.7C13.4 5 13.9 5.3 14.3 5.8L15.5 7.5" />
                  <rect x="4" y="7.5" width="16" height="11" rx="3" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
              <span>Добавить фото</span>
            </label>

            {Array.from({ length: 3 }).map((_, index) => {
              const preview = imagePreviews[index];
              return (
                <div key={index} className={`create-photo-slot ${preview ? "filled" : ""}`}>
                  {preview && <img src={preview} alt={`Фото ${index + 1}`} />}
                </div>
              );
            })}
          </div>

          <p className="create-step-note">
            Добавьте от 1 до 10 фото. Хорошие фото увеличивают шансы на быструю продажу.
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

      <button className="create-submit-premium" onClick={handleSubmit}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 4L10 15" />
          <path d="M21 4L14 21L10 15L3 11L21 4Z" />
        </svg>
        <span>Отправить на модерацию</span>
      </button>

      <div className="create-moderation-note">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="6" y="10" width="12" height="10" rx="2" />
          <path d="M9 10V7.8C9 6.1 10.3 5 12 5C13.7 5 15 6.1 15 7.8V10" />
        </svg>
        <span>Объявление будет проверено модератором</span>
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
