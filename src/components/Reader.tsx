import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { proxied, type Thought } from "../lib/api";
import { useApp } from "../store";
import { catLabel, ReactionBar } from "./ThoughtCard";
import { SlideDeck } from "./SlideCanvas";

/** O‘qish tezligi (so‘z/daqiqa): kartaning vaqti shundan hisoblanadi. Tezroq o‘tishi uchun oshiring. */
const WPM = 120;
const WORD_MS = 60000 / WPM;
/** Tanlanadigan o‘qish shriftlari (faqat shrift: o‘lcham o‘zgarmaydi). */
const FONTS = [
  { id: "literata", name: "Literata", css: "Literata, Georgia, serif", weight: 500 },
  { id: "lora", name: "Lora", css: "Lora, Georgia, serif", weight: 500 },
  { id: "merriweather", name: "Merriweather", css: "Merriweather, Georgia, serif", weight: 700 },
  { id: "playfair", name: "Playfair", css: '"Playfair Display", Georgia, serif', weight: 500 },
  { id: "manrope", name: "Manrope", css: "Manrope, system-ui, sans-serif", weight: 300 },
] as const;
const FONT_KEY = "fg-font";
const loadFont = () => { try { const v = localStorage.getItem(FONT_KEY); return FONTS.find((f) => f.id === v) ?? FONTS[0]; } catch { return FONTS[0]; } };
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const TITLE_MS = 3500;
const CHUNK = 420; // bitta kartadagi belgilar chegarasi (jumla bo‘yicha bo‘linadi)
const HOLD_MS = 220; // shuncha bosib tursangiz — pauza (bosish va surish kartani o‘zgartirmaydi)

/** Uzun abzasni jumlalar bo‘yicha bo‘laklarga bo‘ladi: har kartada bir butun fikr. */
function chunk(p: string, max = CHUNK): string[] {
  if (p.length <= max) return [p];
  const out: string[] = [];
  let cur = "";
  for (const s of p.match(/[^.!?…]+[.!?…]+["”’»]?\s*|[^.!?…]+$/g) ?? [p]) {
    if (cur && (cur + s).length > max) { out.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Chuqur o‘qish: scrollsiz, kartalar o‘zi almashadi. Tepada umumiy qolgan vaqt kamayib boradi,
 * fonda yumshoq shovqin (tepadagi tugma bilan o‘chiriladi). Bosib turing — pauza.
 */
function TimedReader({ t, onClose }: { t: Thought; onClose: () => void }) {
  const { u, c } = useApp();
  const words = useMemo(() => c(t.body).split(/\n\s*\n/).flatMap((p) => chunk(p.trim())).filter(Boolean).map((p) => p.split(/\s+/)), [t.body, c]);
  const total = words.length + 1; // 0-karta: sarlavha
  const dur = useMemo(() => [TITLE_MS, ...words.map((w) => Math.max(2500, w.length * WORD_MS + 700))], [words]);

  const [idx, setIdx] = useState(0);
  const [font, setFont] = useState(loadFont);
  const [sheet, setSheet] = useState(false);
  const [viaProxy, setViaProxy] = useState(false);
  const [secs, setSecs] = useState(() => Math.ceil(dur.reduce((a, b) => a + b, 0) / 1000));
  const bar = useRef<HTMLDivElement>(null);
  const after = useMemo(() => dur.map((_, i) => dur.slice(i + 1).reduce((a, b) => a + b, 0)), [dur]); // keyingi kartalar vaqti
  const totalMs = after[0]! + dur[0]!;
  const [fin, setFin] = useState(false);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);

  const go = useCallback((i: number) => {
    if (i < 0 || i >= total) return;
    elapsed.current = 0;
    setFin(false);
    setIdx(i);
  }, [total]);

  const pickFont = (f: (typeof FONTS)[number]) => {
    setFont(f);
    setSheet(false);
    try { localStorage.setItem(FONT_KEY, f.id); } catch { /* saqlanmasa ham ishlayveradi */ }
  };

  // Soat: so‘z indeksi va qolgan soniya yangilanadi; vaqt tugasa keyingi kartaga o‘tadi (oxirgisida to‘xtaydi).
  useEffect(() => {
    if (paused || sheet || fin) return; // shrift oynasi ochiq bo‘lsa vaqt to‘xtaydi
    const d = dur[idx]!;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const e = elapsed.current;
      const left = Math.max(0, d - e) + after[idx]!; // butun matn bo‘yicha qolgan vaqt
      setSecs(Math.ceil(left / 1000));
      if (bar.current) bar.current.style.transform = `scaleX(${left / totalMs})`;
      if (e >= d) {
        if (idx < total - 1) go(idx + 1);
        else { setFin(true); setSecs(0); if (bar.current) bar.current.style.transform = "scaleX(0)"; }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, paused, sheet, fin, dur, total, go, after, totalMs]);

  // Faqat bosib turish — pauza. Bosish va surish keyingi kartaga o‘tkazmaydi.
  const holdTimer = useRef(0);
  const held = useRef(false);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    held.current = false;
    holdTimer.current = window.setTimeout(() => { held.current = true; setPaused(true); }, HOLD_MS);
  };
  const onUp = () => {
    window.clearTimeout(holdTimer.current);
    if (held.current) { held.current = false; setPaused(false); }
  };
  const onCancel = () => { window.clearTimeout(holdTimer.current); if (held.current) { held.current = false; setPaused(false); } };
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  const w = idx > 0 ? words[idx - 1]! : null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden bg-paper" style={{ backgroundImage: "var(--bg)" }} role="dialog" aria-modal="true" aria-label={c(t.title)}>
      <div className="fg-noise" aria-hidden="true" />
      {/* Rasm: alohida to‘rtburchak emas, pastga qarab sahifa fonida eriydi. Sarlavha kartasida to‘liq, matnda xira. */}
      {t.image_url && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center transition-opacity duration-700" style={{ opacity: idx === 0 ? 1 : 0.2 }} aria-hidden="true">
          <img src={viaProxy ? proxied(t.image_url) : t.image_url} alt="" onError={() => setViaProxy(true)} className="h-[56vh] w-full max-w-[560px] object-cover"
            style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 40%, transparent 100%)", maskImage: "linear-gradient(to bottom, #000 40%, transparent 100%)" }} />
        </div>
      )}
      <div className="relative z-10 flex h-full w-full max-w-[560px] flex-col">
        <div className="px-5 pb-3 pt-[calc(10px+var(--safe-top))]">
          <div className="flex items-center justify-between">
            <button className="glass flex h-11 w-11 items-center justify-center rounded-full" onClick={onClose} aria-label={u("Orqaga")}><ArrowLeft size={20} /></button>
            <span className="text-[17px] font-semibold tabular-nums text-muted" aria-live="off">{fin ? "" : clock(secs)}</span>
            <button className="glass flex h-11 w-11 items-center justify-center rounded-full" onClick={() => setSheet(true)} aria-label={u("Shrift")}>
              <span className="text-[17px] font-semibold leading-none" style={{ fontFamily: font.css }}>Aa</span>
            </button>
          </div>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => <span key={i} className={`h-[3px] flex-1 rounded-full ${i <= idx ? "bg-ink" : "bg-line"}`} />)}
          </div>
          {/* Umumiy qolgan vaqt: chiziq oxirigacha kamayib boradi. */}
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div ref={bar} className="h-full origin-left bg-clay" />
          </div>
        </div>

        <div className="min-h-0 flex-1 select-none touch-manipulation [-webkit-touch-callout:none]" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onCancel} onPointerLeave={onCancel}>
          <motion.section key={idx} className={`flex h-full flex-col px-7 pb-16 ${idx === 0 && t.image_url ? "justify-end" : "justify-center"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            {w ? (
              <>
                <p className="text-[22px] font-normal leading-[1.65] opacity-90" style={{ fontFamily: font.css }}>{w.join(" ")}</p>
                {idx === total - 1 && fin && <div className="mt-8"><ReactionBar t={t} /></div>}
              </>
            ) : (
              <>
                <span className="text-[13px] font-semibold text-clay">{catLabel(t.category, u, c)}</span>
                <h1 className="font-display mt-3 text-[38px] leading-[1.08] text-balance" style={{ fontFamily: font.css, fontWeight: font.weight }}>{c(t.title)}</h1>
                <span className="mt-6 text-[13px] text-muted">{t.read_minutes} {u("daqiqa o‘qish")}</span>
              </>
            )}
          </motion.section>
        </div>
      </div>

      {sheet && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/55" onClick={() => setSheet(false)} role="dialog" aria-modal="true" aria-label={u("Shrift")}>
          <div className="w-full max-w-[560px] rounded-t-3xl bg-paper px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-5 text-ink" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-[13px] font-semibold text-muted">{u("Shrift")}</h3>
            {FONTS.map((f) => (
              <button key={f.id} onClick={() => pickFont(f)} aria-pressed={font.id === f.id}
                className={`flex min-h-[56px] w-full items-center justify-between border-b border-line text-left text-[21px] last:border-0 ${font.id === f.id ? "text-clay" : ""}`} style={{ fontFamily: f.css }}>
                <span>{f.name}</span>
                <span className="text-[15px] opacity-70">{u("To‘g‘ri savol")}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/** Yangi editorial yozuvlar uchun scroll o‘qish rejimi; eski maqolalar avvalgi immersive rejimda qoladi. */
function EditorialReader({ t, onClose }: { t: Thought; onClose: () => void }) {
  const { u, c } = useApp();
  const blocks = t.blocks ?? [];
  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-paper text-ink" role="dialog" aria-modal="true" aria-label={c(t.title)}>
      <article className="relative min-h-full w-full max-w-[560px] pb-[calc(32px+env(safe-area-inset-bottom,0px))]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-5 py-3 backdrop-blur-xl" style={{ paddingTop: "calc(10px + var(--safe-top))" }}>
          <button className="glass flex h-11 w-11 items-center justify-center rounded-full" onClick={onClose} aria-label={u("Orqaga")}><ArrowLeft size={20}/></button>
          <span className="text-xs font-semibold text-muted">{u(t.format === "quick" ? "Qisqa fikr" : "Maqola")}</span>
          <span className="w-11"/>
        </header>
        {t.image_url && <img src={proxied(t.image_url)} alt="" className="max-h-[42vh] w-full object-cover"/>}
        <div className="px-6 pt-8">
          <span className="text-[12px] font-semibold uppercase tracking-[.12em] text-clay">{catLabel(t.category, u, c)}</span>
          <h1 className="mt-3 text-balance font-display text-[34px] font-semibold leading-[1.12]">{c(t.title)}</h1>
          <p className="mt-3 text-[12px] text-muted">{t.read_minutes} {u("daqiqa o‘qish")}</p>
        </div>
        <div className="space-y-6 px-6 pb-8 pt-8">
          {blocks.length ? blocks.map((b) => {
            if (b.type === "divider") return <div key={b.id} className="h-px bg-line"/>;
            if (b.type === "image") return <figure key={b.id} className="space-y-2"><img src={proxied(b.url ?? "")} alt="" className="w-full rounded-2xl object-cover"/>{b.caption && <figcaption className="text-center text-xs text-muted">{c(b.caption)}</figcaption>}</figure>;
            if (b.type === "heading") return <h2 key={b.id} className="pt-2 text-[22px] font-semibold leading-tight">{c(b.text ?? "")}</h2>;
            if (b.type === "quote") return <blockquote key={b.id} className="border-l-2 border-clay py-1 pl-5 font-serif text-[21px] italic leading-relaxed">{c(b.text ?? "")}</blockquote>;
            if (b.type === "list") return <ul key={b.id} className="list-disc space-y-2 pl-6 font-serif text-[18px] leading-[1.7]">{(b.items ?? []).filter(Boolean).map((x,i)=><li key={i}>{c(x)}</li>)}</ul>;
            return <p key={b.id} className="whitespace-pre-wrap font-serif text-[18px] leading-[1.8]">{c(b.text ?? "")}</p>;
          }) : <p className="whitespace-pre-wrap font-serif text-[18px] leading-[1.8]">{c(t.body)}</p>}
          <div className="border-t border-line pt-5"><ReactionBar t={t}/></div>
        </div>
      </article>
    </div>
  );
}

function SlideThoughtReader({ t, onClose }: { t: Thought; onClose: () => void }) {
  const { u, c } = useApp();
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black text-white" role="dialog" aria-modal="true" aria-label={c(t.title)}>
      <div className="relative h-full w-full max-w-[560px] overflow-hidden">
        <SlideDeck slides={t.slides ?? []} c={c}/>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-5 pb-8 pt-[calc(12px+var(--safe-top))]">
          <button className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35" onClick={onClose} aria-label={u("Orqaga")}><ArrowLeft size={20}/></button>
          <span className="max-w-[65%] truncate text-right text-xs font-semibold">{c(t.title)}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/70">{catLabel(t.category, u, c)}</p>
          <ReactionBar t={t}/>
        </div>
      </div>
    </div>
  );
}

export function Reader({ t, onClose }: { t: Thought; onClose: () => void }) {
  if (t.format === "slides" && t.slides?.length) return <SlideThoughtReader t={t} onClose={onClose}/>;
  if (t.blocks?.length) return <EditorialReader t={t} onClose={onClose}/>;
  return <TimedReader t={t} onClose={onClose}/>;
}
