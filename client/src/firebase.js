// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  doc,
  query,
  where,
  increment,
} from "firebase/firestore";

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

/* -------------------- ADS -------------------- */

export async function addAd(ad) {
  return await addDoc(collection(db, "ads"), ad);
}

export async function getAds() {
  const q = query(
    collection(db, "ads"),
    where("status", "==", "approved")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAdById(adId) {
  const ref = doc(db, "ads", adId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getUserAds(userId, status = null) {
  if (!userId) return [];

  let q;

  if (status) {
    q = query(
      collection(db, "ads"),
      where("userId", "==", userId),
      where("status", "==", status)
    );
  } else {
    q = query(collection(db, "ads"), where("userId", "==", userId));
  }

  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function archiveAd(adId) {
  const ref = doc(db, "ads", adId);
  await updateDoc(ref, { status: "archived" });
}

export async function restoreAd(adId) {
  const ref = doc(db, "ads", adId);
  await updateDoc(ref, { status: "approved" });
}

export async function getSellerActiveAdsCount(userId) {
  if (!userId) return 0;

  const q = query(
    collection(db, "ads"),
    where("userId", "==", userId),
    where("status", "==", "approved")
  );

  const snap = await getDocs(q);
  return snap.size;
}

export async function getSellerApprovedAds(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, "ads"),
    where("userId", "==", userId),
    where("status", "==", "approved")
  );

  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/* -------------------- USERS -------------------- */

export async function getUserProfile(userId) {
  if (!userId) return null;

  const ref = doc(db, "users", String(userId));
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
}

export async function saveUserProfile(profile) {
  if (!profile?.userId) return;

  const ref = doc(db, "users", String(profile.userId));

  await setDoc(
    ref,
    {
      userId: profile.userId,
      firstName: profile.firstName || "",
      username: profile.username || "",
      displayName: profile.displayName || profile.firstName || "Пользователь",
      avatarUrl: profile.avatarUrl || "",
      telegramAvatarUrl: profile.telegramAvatarUrl || "",
      bio: profile.bio || "",
      theme: profile.theme || "dark",
      createdAt: profile.createdAt || Date.now(),
    },
    { merge: true }
  );
}

export async function updateUserProfile(userId, data) {
  if (!userId) return;
  const ref = doc(db, "users", String(userId));
  await setDoc(ref, data, { merge: true });
}

/* -------------------- VIEWS -------------------- */

export async function incrementAdViewsForUser(adId, userId) {
  if (!adId || !userId) return false;

  const viewDocId = `${adId}_${userId}`;
  const viewRef = doc(db, "ad_views", viewDocId);
  const existing = await getDoc(viewRef);

  if (existing.exists()) {
    return false;
  }

  await setDoc(viewRef, {
    adId,
    userId,
    createdAt: Date.now(),
  });

  const adRef = doc(db, "ads", adId);
  await updateDoc(adRef, {
    views: increment(1),
  });

  return true;
}

/* -------------------- UPLOAD IMAGE -------------------- */

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    "https://api.imgbb.com/1/upload?key=b60e952b6fc11497de56be77ee165530",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();
  return data.data.url;
}