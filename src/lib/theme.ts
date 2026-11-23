import { tg } from "./tg";

export type Theme = "auto" | "light" | "dark";
const KEY = "fikrnoma-theme";
const PAPER = { light: "#f4f4ef", dark: "#0c1110" } as const;

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}
export function saveTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch { /* xotira yopiq bo‘lsa ham ilova ishlayveradi */ }
}
export const systemDark = (): boolean => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

/** Rejimni sahifaga, brauzer va Telegram sarlavhasi rangiga qo‘llaydi. */
export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme");
  else root.dataset.theme = t;
  const color = t === "dark" || (t === "auto" && systemDark()) ? PAPER.dark : PAPER.light;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  try {
    tg()?.setHeaderColor?.(color);
    tg()?.setBackgroundColor?.(color);
  } catch { /* eski Telegram versiyalarida yo‘q */ }
}
