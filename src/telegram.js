export const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export function initTelegram() {
  if (tg) {
    tg.ready();
    tg.expand();
  } else {
    console.log("Открыто не в Telegram");
  }
}

export function getUser() {
  return tg?.initDataUnsafe?.user || null;
}