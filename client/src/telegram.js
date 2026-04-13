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

  if (!tg) {
    alert("НЕ Telegram");
    return null;
  }

  if (!tg.initDataUnsafe) {
    alert("НЕТ initDataUnsafe");
    return null;
  }

  if (!tg.initDataUnsafe.user) {
    alert("НЕТ USER В TELEGRAM");
    return null;
  }

  return tg.initDataUnsafe.user;
}