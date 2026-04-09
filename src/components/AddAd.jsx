import { useState } from "react";
import { addAd } from "../firebase";
import { uploadImage } from "../firebase";
import { getUser } from "../telegram";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const id = Date.now().toString();

export default function AddAd() {
    const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

const handleSubmit = async () => {
  const user = getUser();
  if (!title || !price) {
    setMessage("Заполни название и цену");
    return;
  }

  let imageUrl = "";

  try {
    if (image) {
      setMessage("Загрузка фото...");
      imageUrl = await uploadImage(image);
    }

    await setDoc(doc(db, "ads", id), {
      id,
      title,
      price,
      description,
      imageUrl,
      status: "pending",
      createdAt: Date.now(),

      userId: user?.id || null,
      username: user?.username || null,
      firstName: user?.first_name || "Гость"
    });

    await fetch("http://localhost:3000/new-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title,
        price,
        description,
        imageUrl,
        userId: user?.id
      }),
    });

    setTitle("");
    setPrice("");
    setDescription("");
    setImage(null);

    setMessage("✅ Отправлено на модерацию");
  } catch (err) {
    console.error(err);
    setMessage("❌ Ошибка загрузки");
  }
};

  return (
    <div style={{ padding: 20 }}>
      <h2>Создать объявление</h2>

      <input
        placeholder="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        placeholder="Цена"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <textarea
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input type="file" onChange={(e) => setImage(e.target.files[0])} />

      <button onClick={handleSubmit}>Опубликовать</button>

      <p>{message}</p>
    </div>
  );
}