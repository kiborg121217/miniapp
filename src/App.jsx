import { initTelegram, getUser } from "./telegram";

export default App;

import { useEffect, useState } from "react";
import { addAd, getAds } from "./firebase";

function App() {
  const [ads, setAds] = useState([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    loadAds();
  }, []);

  async function loadAds() {
    const data = await getAds();
    setAds(data);
  }

  async function handleAdd() {
    await addAd({ title });
    loadAds();
  }

  return (
    <div>
      <h1>Барахолка</h1>

      <input onChange={e => setTitle(e.target.value)} />
      <button onClick={handleAdd}>Добавить</button>

      {ads.map(ad => (
        <div key={ad.id}>
          {ad.title}
        </div>
      ))}
    </div>
  );
}