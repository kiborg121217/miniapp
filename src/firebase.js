// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

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
  const snap = await getDocs(collection(db, "ads"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}