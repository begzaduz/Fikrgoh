type WebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  openTelegramLink?: (url: string) => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void };
  BackButton?: { show: () => void; hide: () => void; onClick: (f: () => void) => void; offClick: (f: () => void) => void };
};
declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

export const tg = () => window.Telegram?.WebApp;
export const haptic = {
  tap: () => tg()?.HapticFeedback?.impactOccurred("light"),
  ok: () => tg()?.HapticFeedback?.notificationOccurred("success"),
  err: () => tg()?.HapticFeedback?.notificationOccurred("error"),
};

/** initData ichidan Telegram foydalanuvchi ID'sini oladi (imzoni server tekshiradi; bu faqat sessiya mosligini solishtirish uchun). */
export function tgUserId(initData: string): number | null {
  try {
    const id = JSON.parse(new URLSearchParams(initData).get("user") ?? "")?.id;
    return typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

/** Bot nomi (@BotFather dagi username, @siz). Boshqacha bo‘lsa .env da VITE_TG_BOT ni yozing. */
export const BOT = ((import.meta as { env?: Record<string, string> }).env?.VITE_TG_BOT) || "fikrnomabot";
/** Short'ni Telegram orqali ulashadi (ro‘yxatdan chat tanlanadi). Telegramdan tashqarida: tizim ulashish oynasi yoki yangi oyna. */
export function share(text: string, id: number) {
  const link = `https://t.me/${BOT}?startapp=short_${id}`;
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  const w = tg();
  if (w?.openTelegramLink) w.openTelegramLink(url);
  else if (typeof navigator.share === "function") void navigator.share({ text, url: link }).catch(() => {});
  else window.open(url, "_blank");
}
