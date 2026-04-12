export function getTelegram() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp || null;
}

export function initTelegram() {
  const tg = getTelegram();

  if (tg) {
    tg.ready();
    tg.expand();

    console.log("Telegram init OK");
    console.log("USER:", tg.initDataUnsafe?.user);
  } else {
    console.log("НЕ Telegram");
  }
}

export function getUser() {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.user || null;
}