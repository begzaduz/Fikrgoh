/** Fikrnomiya dizayn tizimi: o‘tkir burchaklar, qalin qoidalar (chiziqlar), tor qalin sarlavhalar, mono yorliqlar. Ranglar CSS o‘zgaruvchilari orqali. */
const sharp = "0px";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    borderRadius: { none: sharp, sm: sharp, DEFAULT: sharp, md: sharp, lg: sharp, xl: sharp, "2xl": sharp, "3xl": sharp, full: sharp },
    extend: {
      colors: {
        paper: "var(--paper)", ink: "var(--ink)", sand: "var(--sand)", line: "var(--line)",
        muted: "var(--muted)", clay: "var(--clay)", onclay: "var(--onclay)", sage: "var(--sage)",
        night: "var(--night)", onnight: "var(--onnight)",
      },
      // sans va display: Archivo (display tor va qalin qilib css da sozlanadi), serif: Literata (uzun matn), mono: yorliqlar
      fontFamily: {
        sans: ["Archivo", "system-ui", "sans-serif"], display: ["Archivo", "system-ui", "sans-serif"],
        serif: ["Literata", "Georgia", "serif"], mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
};
