/** Fikrnomiya: tungi indigo + aqua ("mindset": sokin, ravshan, o‘sish) va amber uchqun. Ranglar CSS o‘zgaruvchilari orqali, yorug‘/qorong‘i rejim bilan. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)", ink: "var(--ink)", sand: "var(--sand)", line: "var(--line)",
        muted: "var(--muted)", clay: "var(--clay)", onclay: "var(--onclay)", spark: "var(--spark)",
      },
      // sans/display: Manrope (UI va sarlavhalar), serif: EB Garamond (uzun matn)
      fontFamily: { sans: ["Manrope", "system-ui", "sans-serif"], display: ["Manrope", "system-ui", "sans-serif"], serif: ["\"EB Garamond\"", "Garamond", "Georgia", "serif"] },
    },
  },
};
