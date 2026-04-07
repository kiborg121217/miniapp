import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4cSRFhtCSVSbLrymCeGtRsvj9XvmzU2Q",
  authDomain: "miniapp-35.firebaseapp.com",
  projectId: "miniapp-35"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function addAd(ad) {
  await addDoc(collection(db, "ads"), ad);
}

export async function getAds() {
  const snap = await getDocs(collection(db, "ads"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}