type WebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
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
