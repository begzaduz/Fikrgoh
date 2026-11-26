/**
 * Short slaydlari: har bir slayd 9:16 tuval, ustida matn va rasm elementlari.
 * Joylashuv foizda (x, y = element markazi, w = kenglik), shrift o‘lchami 360 px kenglikka nisbatan (size).
 * Matnlar bazada KANONIK (yangi) alifboda saqlanadi, ko‘rsatishda tanlangan alifboga o‘giriladi.
 */
export type Font = "display" | "serif" | "sans";
type Base = { id: string; x: number; y: number; w: number; rot: number };
export type TextEl = Base & { type: "text"; text: string; size: number; color: string; font: Font; align: "left" | "center" | "right"; bold: boolean; italic: boolean; bar: boolean };
export type ImageEl = Base & { type: "image"; src: string; round: boolean; fade?: number };
export type El = TextEl | ImageEl;
export type Slide = { bg: { css: string; image: string | null; dim: number; fade?: number }; els: El[] };

export const MAX_SLIDES = 10;
export const MAX_ELS = 12;

export const BGS = [
  "linear-gradient(180deg,#3a46a8,#141b52)",
  "linear-gradient(180deg,#11877c,#0b2c3b)",
  "linear-gradient(180deg,#1a2158,#070a1f)",
  "linear-gradient(180deg,#ffc27a,#f0867a 50%,#7a3f8f)",
  "#f1f4ff",
  "#f3ecdd",
  "#0b0b0f",
];
export const COLORS = ["#ffffff", "#141b45", "#ffc46b", "#7ee8d8", "#f0867a", "#818cf8"];

export const uid = () => Math.random().toString(36).slice(2, 10);
export const blankSlide = (css: string = BGS[0]!): Slide => ({ bg: { css, image: null, dim: 0 }, els: [] });

export type TextKind = "quote" | "title" | "caption" | "plain";
const PRESET: Record<TextKind, Partial<TextEl>> = {
  quote: { y: 50, w: 80, size: 30, font: "serif", align: "left", italic: true, bar: true },
  title: { y: 30, w: 84, size: 44, font: "display", align: "center", bold: true },
  caption: { y: 88, w: 70, size: 15, font: "sans", align: "center" },
  plain: { y: 55, w: 80, size: 26, font: "display", align: "center" },
};
export function newText(kind: TextKind, text: string, over: Partial<TextEl> = {}): TextEl {
  return { id: uid(), type: "text", x: 50, y: 50, w: 80, rot: 0, text, size: 26, color: "#ffffff", font: "display", align: "center", bold: false, italic: false, bar: false, ...PRESET[kind], ...over };
}

/** Tayyor shablonlar (joriy slayd elementlari almashadi, fon saqlanadi). */
export const TEMPLATES: Array<{ name: string; make: (ph: string) => El[] }> = [
  { name: "Iqtibos", make: (ph) => [newText("quote", ph), newText("caption", "—", { y: 84 })] },
  { name: "Sarlavha va matn", make: (ph) => [newText("title", ph), newText("plain", ph, { y: 62, size: 20, w: 78, bold: false })] },
  { name: "Katta so‘z", make: (ph) => [newText("title", ph, { y: 50, size: 64, w: 88 })] },
];

const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

/** Bazadan kelgan jsonb'ni tekshirib, xavfsiz Slide[] ga o‘giradi (yaroqsiz bo‘lsa null). */
export function cleanSlides(raw: unknown): Slide[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Slide[] = [];
  for (const s of raw.slice(0, MAX_SLIDES)) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, any>;
    const bg = (o.bg && typeof o.bg === "object" ? o.bg : {}) as Record<string, unknown>;
    const els: El[] = [];
    for (const e of Array.isArray(o.els) ? o.els.slice(0, MAX_ELS) : []) {
      if (!e || typeof e !== "object") continue;
      const base = { id: str(e.id) || uid(), x: num(e.x, 50, -20, 120), y: num(e.y, 50, -20, 120), w: num(e.w, 60, 5, 100), rot: num(e.rot, 0, -180, 180) };
      if (e.type === "text") {
        els.push({ ...base, type: "text", text: str(e.text), size: num(e.size, 26, 8, 120), color: str(e.color, "#ffffff"), font: e.font === "serif" || e.font === "sans" ? e.font : "display",
          align: e.align === "left" || e.align === "right" ? e.align : "center", bold: !!e.bold, italic: !!e.italic, bar: !!e.bar });
      } else if (e.type === "image" && typeof e.src === "string") els.push({ ...base, type: "image", src: e.src, round: !!e.round, fade: num(e.fade, 0, 0, 50) });
    }
    out.push({ bg: { css: str(bg.css, BGS[0]), image: typeof bg.image === "string" ? bg.image : null, dim: num(bg.dim, 0, 0, 0.8), fade: num(bg.fade, 0, 0, 100) }, els });
  }
  return out.length ? out : null;
}

const isText = (e: El): e is TextEl => e.type === "text";

/** Barcha matnlarga funksiya qo‘llaydi (masalan, alifbo o‘girish). */
export const mapText = (sl: Slide[], f: (s: string) => string): Slide[] =>
  sl.map((s) => ({ ...s, els: s.els.map((e) => (isText(e) ? { ...e, text: f(e.text) } : e)) }));

/** Qidiruv va ulashish uchun: slayd matnlarini bitta qatorga yig‘adi. */
export const slidesText = (sl: Slide[]): string => sl.flatMap((s) => s.els.filter(isText).map((e) => e.text.trim())).filter(Boolean).join(" ");

/** Slaydlardagi barcha rasm havolalari (Storage'dan tozalash uchun). */
export const slideUrls = (sl?: Slide[] | null): string[] =>
  (sl ?? []).flatMap((s) => [s.bg.image, ...s.els.map((e) => (e.type === "image" ? e.src : null))].filter((x): x is string => !!x));

export const hasContent = (sl: Slide[]) => sl.length > 0 && sl.some((s) => s.els.length > 0);
