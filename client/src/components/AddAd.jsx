import { useState } from "react";
import { uploadImage } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function AddAd({ user }) {
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

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
    if (!image) missing.push("Изображение");

    if (missing.length > 0) {
      setMessage("Заполните: " + missing.join(", "));
      return;
    }

    const id = Date.now().toString();

    try {
      setMessage("Загрузка фото...");
      const imageUrl = await uploadImage(image);

      await setDoc(doc(db, "ads", id), {
        id,
        title,
        price,
        description,
        imageUrl,
        status: "pending",
        createdAt: Date.now(),
        userId: realUser.id,
        username: realUser.username || null,
        firstName: realUser.first_name || "Гость",
      });

      const response = await fetch("https://miniapp-1wzi.onrender.com/new-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          price,
          description,
          imageUrl,
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
      setImage(null);
      setMessage("✅ Отправлено на модерацию");
    } catch (err) {
      console.error(err);
      setMessage("❌ Ошибка отправки в модерацию");
    }
  };

  return (
    <div className="form">
      <div
        style={{
          marginBottom: 18,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.46)",
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          Новое объявление
        </div>

        <h2>Создать объявление</h2>

        <div
          style={{
            maxWidth: 460,
            margin: "10px auto 0",
            color: "rgba(255,255,255,0.58)",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          Заполни карточку товара, добавь фото и отправь объявление на модерацию.
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 14,
          boxShadow: "0 16px 34px rgba(0,0,0,0.16)",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.52)" }}>
            Название
          </div>
          <input
            placeholder="Например: iPhone 13 128 GB"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.52)" }}>
            Цена
          </div>
          <input
            placeholder="Например: 35000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.52)" }}>
            Описание
          </div>
          <textarea
            placeholder="Опиши состояние, комплектацию и важные детали"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 4 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.52)" }}>
            Фото
          </div>
          <input
            type="file"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>

        <button onClick={handleSubmit}>Опубликовать</button>

        <p>{message}</p>
      </div>
    </div>
  );
}