import { getApps, initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const DEFAULT_FOLDER = "baraholka";
const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_PARALLEL_UPLOADS = 3;
const FIREBASE_UPLOAD_APP_NAME = "baraholka-upload-fallback";
let firebaseFallbackStorage = null;

const firebaseUploadConfig = {
  apiKey: "AIzaSyB4cSRFhtCSVSbLrymCeGtRsvj9XvmzU2Q",
  authDomain: "miniapp-35.firebaseapp.com",
  projectId: "miniapp-35",
  storageBucket: "miniapp-35.appspot.com",
  messagingSenderId: "993518423599",
  appId: "1:993518423599:web:cee1a36018a006c03980da",
};

function getCloudinaryCloudName() {
  return String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
}

function getCloudinaryUploadPreset() {
  return String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim();
}

function getCloudinaryFolder() {
  return String(import.meta.env.VITE_CLOUDINARY_FOLDER || DEFAULT_FOLDER).trim() || DEFAULT_FOLDER;
}

function getMaxDimension() {
  const value = Number(import.meta.env.VITE_IMAGE_MAX_DIMENSION || DEFAULT_MAX_DIMENSION);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_DIMENSION;
}

function getImageQuality() {
  const value = Number(import.meta.env.VITE_IMAGE_COMPRESSION_QUALITY || DEFAULT_QUALITY);
  if (!Number.isFinite(value)) return DEFAULT_QUALITY;
  return Math.min(0.92, Math.max(0.55, value));
}

export function getParallelUploadLimit() {
  const value = Number(import.meta.env.VITE_IMAGE_PARALLEL_UPLOADS || DEFAULT_PARALLEL_UPLOADS);
  if (!Number.isFinite(value)) return DEFAULT_PARALLEL_UPLOADS;
  return Math.min(4, Math.max(1, Math.floor(value)));
}

function hasCloudinaryConfig() {
  return Boolean(getCloudinaryCloudName() && getCloudinaryUploadPreset());
}

function getFileBaseName(file) {
  const raw = String(file?.name || "image").replace(/\.[^.]+$/, "");
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function getFileExtension(file) {
  const name = String(file?.name || "");
  const match = name.match(/\.([a-z0-9]+)$/i);
  if (match?.[1]) return match[1].toLowerCase();

  const type = String(file?.type || "");
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function loadImageElement(file) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createSourceImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Safari/WebView may reject some HEIC/JPEG variants. Fallback to HTMLImageElement.
    }
  }

  return await loadImageElement(file);
}

function getSourceSize(source) {
  return {
    width: source.width || source.naturalWidth || 0,
    height: source.height || source.naturalHeight || 0,
  };
}

function closeSource(source) {
  if (typeof source?.close === "function") {
    try {
      source.close();
    } catch {
      // ignore
    }
  }
}

export async function compressImageBeforeUpload(file) {
  if (!file || !String(file.type || "").startsWith("image/")) return file;

  // Keep animated GIF/WebP files untouched. Canvas would flatten animation to the first frame.
  if (["image/gif", "image/svg+xml"].includes(file.type)) return file;

  const maxDimension = getMaxDimension();
  const quality = getImageQuality();
  let source = null;

  try {
    source = await createSourceImage(file);
    const { width, height } = getSourceSize(source);

    if (!width || !height) return file;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

    if (!ctx) return file;

    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) return file;

    // If compression unexpectedly increases the file a lot, keep the original.
    if (file.size && blob.size > file.size * 1.08) return file;

    return new File([blob], `${getFileBaseName(file)}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Не удалось сжать изображение перед загрузкой:", error);
    return file;
  } finally {
    closeSource(source);
  }
}

export function getCloudinaryUploadConfig() {
  return {
    cloudName: getCloudinaryCloudName(),
    uploadPreset: getCloudinaryUploadPreset(),
    folder: getCloudinaryFolder(),
  };
}

function getFirebaseFallbackStorage() {
  if (firebaseFallbackStorage) return firebaseFallbackStorage;

  const app = getApps().find((item) => item.name === FIREBASE_UPLOAD_APP_NAME)
    || initializeApp(firebaseUploadConfig, FIREBASE_UPLOAD_APP_NAME);
  firebaseFallbackStorage = getStorage(app);
  return firebaseFallbackStorage;
}

async function uploadPreparedFileToFirebaseStorage(file, folder) {
  const storage = getFirebaseFallbackStorage();
  const timestamp = Date.now();
  const randomPart =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  const storagePath = `${folder}/${timestamp}-${randomPart}-${getFileBaseName(file)}.${getFileExtension(file)}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file?.type || "image/jpeg",
    cacheControl: "public,max-age=31536000,immutable",
  });

  return await getDownloadURL(storageRef);
}

export async function uploadImageToCloudinary(file, options = {}) {
  const { cloudName, uploadPreset, folder } = getCloudinaryUploadConfig();
  const preparedFile = options.skipCompression ? file : await compressImageBeforeUpload(file);

  if (!hasCloudinaryConfig()) {
    return await uploadPreparedFileToFirebaseStorage(preparedFile, folder);
  }

  const formData = new FormData();

  formData.append("file", preparedFile);
  formData.append("upload_preset", uploadPreset);
  formData.append("tags", "baraholka,user_upload");

  // New Cloudinary accounts use dynamic folders: asset_folder puts files in Media Library folder.
  // Also set the same folder inside the unsigned upload preset as the source of truth.
  formData.append("asset_folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
    signal: options.signal,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.secure_url) {
    const message = data?.error?.message || `Cloudinary upload failed (${res.status})`;
    throw new Error(message);
  }

  return data.secure_url;
}

export async function uploadImagesToCloudinary(files, options = {}) {
  const list = Array.from(files || []).filter(Boolean);
  const concurrency = Number(options.concurrency || getParallelUploadLimit());
  const results = new Array(list.length);
  let nextIndex = 0;
  let completed = 0;

  const worker = async () => {
    while (nextIndex < list.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      results[currentIndex] = await uploadImageToCloudinary(list[currentIndex], options);
      completed += 1;
      options.onProgress?.({ completed, total: list.length, index: currentIndex });
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, list.length) }, worker);
  await Promise.all(workers);

  return results;
}

export function isCloudinaryUrl(url) {
  return typeof url === "string" && /https?:\/\/res\.cloudinary\.com\//.test(url) && url.includes("/image/upload/");
}

export function addCloudinaryTransform(url, transformation = "f_auto,q_auto") {
  if (!isCloudinaryUrl(url) || !transformation) return url || "";

  const marker = "/image/upload/";
  const markerIndex = url.indexOf(marker);
  const prefix = url.slice(0, markerIndex + marker.length);
  const rest = url.slice(markerIndex + marker.length);

  if (!rest || rest.startsWith(`${transformation}/`)) return url;

  return `${prefix}${transformation}/${rest}`;
}

export function getCardImageUrl(url) {
  return addCloudinaryTransform(url, "f_auto,q_auto,w_720,c_limit");
}

export function getThumbImageUrl(url) {
  return addCloudinaryTransform(url, "f_auto,q_auto,w_220,h_220,c_fill,g_auto");
}

export function getAdPageImageUrl(url) {
  return addCloudinaryTransform(url, "f_auto,q_auto,w_1400,c_limit");
}

export function getAvatarImageUrl(url) {
  return addCloudinaryTransform(url, "f_auto,q_auto,w_180,h_180,c_fill,g_face");
}
