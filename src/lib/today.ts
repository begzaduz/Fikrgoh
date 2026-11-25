/** Kun va soat Toshkent vaqti bo‘yicha (bazadagi "kun" bilan bir xil). */
const fmt = (o: Intl.DateTimeFormatOptions, d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", ...o }).format(d);
export const tashkentDate = (d = new Date()) => fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, d);

/** Joriy haftaning (dushanba–yakshanba) sanalari "YYYY-MM-DD" ko‘rinishida. */
export function weekDates(todayIndex: number): string[] {
  const [y, m, d] = tashkentDate().split("-").map(Number) as [number, number, number];
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => new Date(base + (i - todayIndex) * 86400000).toISOString().slice(0, 10));
}
