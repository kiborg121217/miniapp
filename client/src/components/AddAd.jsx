import { useEffect, useState } from "react";
import {
  uploadImage,
  getUserProfile,
  saveUserProfile,
} from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORIES } from "../categories";

export default function AddAd({ user }) {
  const [images, setImages] = useState([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

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
    <div className="form page-enter">
      <div className="form-hero">
        <div className="form-kicker">Новое объявление</div>
        <h2>Разместить товар</h2>
        <p className="form-subtitle">
          Добавь название, честное описание, цену, категорию и фото — так объявление
          будет смотреться аккуратно и быстрее пройдёт модерацию.
        </p>
      </div>

      <div className="form-panel">
        <div className="field-block">
          <label className="field-label">Название</label>
          <input
            placeholder="Например: iPhone 13, 128 GB"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Цена</label>
          <input
            placeholder="Например: 35000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Категория</label>
          <button
            type="button"
            className="picker-trigger"
            onClick={() => setShowCategoryPicker(true)}
          >
            {category || "Выберите категорию"}
          </button>
        </div>

        <div className="field-block">
          <label className="field-label">Описание</label>
          <textarea
            placeholder="Опиши состояние, комплектацию, дефекты, торг и всё важное для покупателя"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Фото</label>
          <input
            type="file"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
          {!!images.length && (
            <div className="upload-note">Выбрано файлов: {images.length}</div>
          )}
        </div>

        <button className="form-submit" onClick={handleSubmit}>
          Опубликовать
        </button>

        {!!message && <p className="form-message">{message}</p>}
      </div>

      {showCategoryPicker && (
        <div className="sheet-backdrop" onClick={() => setShowCategoryPicker(false)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">Выберите категорию</div>
            <div className="category-list">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`category-option ${category === item ? "active" : ""}`}
                  onClick={() => {
                    setCategory(item);
                    setShowCategoryPicker(false);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}