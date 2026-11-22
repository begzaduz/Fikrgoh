type WebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
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
