/** Brendbook ranglari CSS o‘zgaruvchilari orqali (yorug‘/qorong‘i rejim avtomatik). */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)", ink: "var(--ink)", sand: "var(--sand)", line: "var(--line)",
        muted: "var(--muted)", clay: "var(--clay)", onclay: "var(--onclay)", sage: "var(--sage)",
        night: "var(--night)", onnight: "var(--onnight)", peach: "#e39a70",
      },
      fontFamily: { serif: ['"Playfair Display"', "Georgia", "serif"], sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
};
