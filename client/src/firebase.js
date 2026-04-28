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
  deleteDoc,
  doc,
  query,
  where,
  increment,
  onSnapshot,
  orderBy,
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

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "https://miniapp-1wzi.onrender.com";

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

export async function getAdById(adId, options = {}) {
  if (!adId) return null;

  const ref = doc(db, "ads", String(adId));
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  const includeInactive = options?.includeInactive === true;

  if (!includeInactive && data.status !== "approved") {
    return null;
  }

  return { id: snap.id, ...data };
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


export async function getSellerArchivedAdsCount(userId) {
  if (!userId) return 0;

  const q = query(
    collection(db, "ads"),
    where("userId", "==", userId),
    where("status", "==", "archived")
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


export async function getUserProfileBundle(user) {
  if (!user?.id) return null;

  let profile = await getUserProfile(user.id);

  if (!profile) {
    await saveUserProfile({
      userId: user.id,
      firstName: user.first_name || "",
      username: user.username || "",
      displayName: user.first_name || "Пользователь",
      avatarUrl: "",
      telegramAvatarUrl: "",
      bio: "",
      theme: "dark",
      createdAt: Date.now(),
      isVerified: false,
      verifiedAt: null,
      phoneNumber: "",
    });

    profile = await getUserProfile(user.id);
  }

  const [activeAds, archivedAds, pendingAds, rejectedAds, favoriteAds] = await Promise.all([
    getUserAds(user.id, "approved"),
    getUserAds(user.id, "archived"),
    getUserAds(user.id, "pending"),
    getUserAds(user.id, "rejected"),
    getUserFavoriteAds(user.id),
  ]);

  return {
    profile,
    activeAds,
    archivedAds,
    pendingAds,
    rejectedAds,
    favoriteAds,
    loadedAt: Date.now(),
  };
}

export async function updateUserProfile(userId, data) {
  if (!userId) return;
  const ref = doc(db, "users", String(userId));
  await setDoc(ref, data, { merge: true });
}


/* -------------------- FAVORITES -------------------- */

function getFavoriteDocId(userId, adId) {
  return `${String(userId)}_${String(adId)}`;
}

export async function getUserFavoriteIds(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, "user_favorites"),
    where("userId", "==", String(userId))
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => String(d.data().adId)).filter(Boolean);
}

export async function isAdFavorite(userId, adId) {
  if (!userId || !adId) return false;

  const ref = doc(db, "user_favorites", getFavoriteDocId(userId, adId));
  const snap = await getDoc(ref);

  return snap.exists();
}

export async function toggleFavoriteAd(userId, adId) {
  if (!userId || !adId) {
    throw new Error("Для добавления в избранное нужно открыть приложение через Telegram");
  }

  const ref = doc(db, "user_favorites", getFavoriteDocId(userId, adId));
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }

  await setDoc(ref, {
    userId: String(userId),
    adId: String(adId),
    createdAt: Date.now(),
  });

  return true;
}

export async function getUserFavoriteAds(userId) {
  if (!userId) return [];

  const favoriteIds = await getUserFavoriteIds(userId);

  if (favoriteIds.length === 0) return [];

  const ads = await Promise.all(
    favoriteIds.map(async (adId) => {
      try {
        return await getAdById(adId);
      } catch {
        return null;
      }
    })
  );

  return ads
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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


/* -------------------- CHATS -------------------- */

function toId(value) {
  return String(value || "").trim();
}

function getAdImage(ad) {
  if (Array.isArray(ad?.imageUrls) && ad.imageUrls.length > 0) return ad.imageUrls[0];
  return ad?.imageUrl || "";
}

export function getChatDocId(adId, buyerId, sellerId) {
  return `${toId(adId)}_${toId(buyerId)}_${toId(sellerId)}`;
}

async function notifyChatMessage(chatId, messageId) {
  try {
    await fetch(`${API_BASE}/notify-chat-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, messageId }),
    });
  } catch (error) {
    console.warn("Не удалось отправить Telegram-уведомление о сообщении:", error);
  }
}

export async function startChatForAd(ad, buyer) {
  if (!ad?.id || !ad?.userId) {
    throw new Error("Не удалось определить продавца объявления");
  }

  if (!buyer?.id) {
    throw new Error("Чтобы написать продавцу, нужно войти через Telegram");
  }

  const adId = toId(ad.id);
  const buyerId = toId(buyer.id);
  const sellerId = toId(ad.userId);

  if (buyerId === sellerId) {
    throw new Error("Нельзя открыть чат со своим объявлением");
  }

  const chatId = getChatDocId(adId, buyerId, sellerId);
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  const now = Date.now();

  const payload = {
    adId,
    adTitle: ad.title || "Объявление",
    adImage: getAdImage(ad),
    buyerId,
    sellerId,
    participants: [buyerId, sellerId],
    updatedAt: now,
  };

  if (snap.exists()) {
    await setDoc(chatRef, payload, { merge: true });
    return { id: chatId, ...snap.data(), ...payload };
  }

  const newChat = {
    ...payload,
    lastMessage: "",
    lastMessageAt: now,
    unreadByBuyer: 0,
    unreadBySeller: 0,
    createdAt: now,
  };

  await setDoc(chatRef, newChat);
  return { id: chatId, ...newChat };
}

export async function getChatById(chatId) {
  if (!chatId) return null;
  const ref = doc(db, "chats", String(chatId));
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenUserChats(userId, callback, onError) {
  if (!userId) {
    callback?.([]);
    return () => {};
  }

  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", toId(userId))
  );

  return onSnapshot(
    q,
    (snap) => {
      const chats = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt || b.lastMessageAt || 0) - (a.updatedAt || a.lastMessageAt || 0));
      callback?.(chats);
    },
    (error) => {
      console.error("Ошибка подписки на чаты:", error);
      onError?.(error);
    }
  );
}

export function listenChatMessages(chatId, callback, onError) {
  if (!chatId) {
    callback?.([]);
    return () => {};
  }

  const q = query(
    collection(db, "chats", String(chatId), "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snap) => {
      callback?.(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error("Ошибка подписки на сообщения:", error);
      onError?.(error);
    }
  );
}

export async function sendChatMessage(chatId, senderId, text) {
  const cleanText = String(text || "").trim();
  if (!chatId || !senderId || !cleanText) return null;

  const chatRef = doc(db, "chats", String(chatId));
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Диалог не найден");
  }

  const chat = chatSnap.data();
  const normalizedSenderId = toId(senderId);
  const participants = Array.isArray(chat.participants) ? chat.participants.map(toId) : [];

  if (!participants.includes(normalizedSenderId)) {
    throw new Error("Вы не являетесь участником этого диалога");
  }

  const now = Date.now();
  const messageRef = await addDoc(collection(db, "chats", String(chatId), "messages"), {
    senderId: normalizedSenderId,
    text: cleanText,
    createdAt: now,
    read: false,
  });

  const unreadField = normalizedSenderId === toId(chat.buyerId) ? "unreadBySeller" : "unreadByBuyer";

  await updateDoc(chatRef, {
    lastMessage: cleanText,
    lastMessageAt: now,
    updatedAt: now,
    [unreadField]: increment(1),
  });

  notifyChatMessage(String(chatId), messageRef.id);

  return messageRef.id;
}

export async function markChatRead(chatId, userId) {
  if (!chatId || !userId) return;

  const chatRef = doc(db, "chats", String(chatId));
  const snap = await getDoc(chatRef);
  if (!snap.exists()) return;

  const chat = snap.data();
  const normalizedUserId = toId(userId);
  const patch = {};

  if (normalizedUserId === toId(chat.buyerId)) patch.unreadByBuyer = 0;
  if (normalizedUserId === toId(chat.sellerId)) patch.unreadBySeller = 0;

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = Date.now();
    await updateDoc(chatRef, patch);
  }
}

export async function getNotificationSettings(userId) {
  const profile = await getUserProfile(userId);
  const notifications = profile?.notifications || {};

  return {
    chatMessages: notifications.chatMessages !== false,
    moderation: notifications.moderation !== false,
    promotion: notifications.promotion !== false,
    favorites: notifications.favorites === true,
    botCanMessage: profile?.botCanMessage === true,
  };
}

export async function updateNotificationSettings(userId, patch) {
  if (!userId) throw new Error("Нужно войти через Telegram");

  const ref = doc(db, "users", toId(userId));
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data() : {};
  const currentNotifications = current.notifications || {};
  const nextNotifications = { ...currentNotifications };
  const data = {
    updatedAt: Date.now(),
  };

  if (Object.prototype.hasOwnProperty.call(patch, "botCanMessage")) {
    data.botCanMessage = !!patch.botCanMessage;
  }

  for (const key of ["chatMessages", "moderation", "promotion", "favorites"]) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      nextNotifications[key] = !!patch[key];
    }
  }

  if (Object.keys(nextNotifications).length > 0) {
    data.notifications = nextNotifications;
  }

  await setDoc(ref, data, { merge: true });
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