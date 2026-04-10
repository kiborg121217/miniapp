// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4cSRFhtCSVSbLrymCeGtRsvj9XvmzU2Q",
  authDomain: "miniapp-35.firebaseapp.com",
  projectId: "miniapp-35",
  storageBucket: "miniapp-35.appspot.com",
  messagingSenderId: "993518423599",
  appId: "1:993518423599:web:cee1a36018a006c03980da",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Функции для работы с коллекцией "ads"
export async function addAd(ad) {
  return await addDoc(collection(db, "ads"), ad);
}

export async function getAds() {
  const q = query(
    collection(db, "ads"),
    where("status", "==", "approved")
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("https://api.imgbb.com/1/upload?key=b60e952b6fc11497de56be77ee165530", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  return data.data.url;
}