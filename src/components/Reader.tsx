import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { createAmbient } from "../lib/ambient";
import type { Thought } from "../lib/api";
import { useApp } from "../store";
import { catLabel, ReactionBar } from "./ThoughtCard";

/** O‘qish tezligi (so‘z/daqiqa): kartaning vaqti shundan hisoblanadi. Tezroq o‘tishi uchun oshiring. */
const WPM = 120;
const WORD_MS = 60000 / WPM;
const SOUND_KEY = "fg-sound";
const loadSound = (): boolean => { try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } };
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
export function Reader({ t, onClose }: { t: Thought; onClose: () => void }) {
  const { u, c } = useApp();
  const words = useMemo(() => c(t.body).split(/\n\s*\n/).flatMap((p) => chunk(p.trim())).filter(Boolean).map((p) => p.split(/\s+/)), [t.body, c]);
  const total = words.length + 1; // 0-karta: sarlavha
  const dur = useMemo(() => [TITLE_MS, ...words.map((w) => Math.max(2500, w.length * WORD_MS + 700))], [words]);

  const [idx, setIdx] = useState(0);
  const [sound, setSound] = useState(loadSound);
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

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch { /* saqlanmasa ham ishlayveradi */ }
  };
  useEffect(() => {
    if (!sound) return;
    const a = createAmbient();
    a.start();
    return a.stop;
  }, [sound]);

  // Soat: so‘z indeksi va qolgan soniya yangilanadi; vaqt tugasa keyingi kartaga o‘tadi (oxirgisida to‘xtaydi).
  useEffect(() => {
    if (paused || fin) return;
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
  }, [idx, paused, fin, dur, total, go, after, totalMs]);

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
      <div className="relative z-10 flex h-full w-full max-w-[560px] flex-col">
        <div className="px-5 pb-3 pt-[calc(10px+var(--safe-top))]">
          <div className="flex items-center justify-between">
            <button className="glass flex h-11 w-11 items-center justify-center rounded-full" onClick={onClose} aria-label={u("Orqaga")}><ArrowLeft size={20} /></button>
            <span className="text-[17px] font-semibold tabular-nums text-muted" aria-live="off">{fin ? "" : clock(secs)}</span>
            <button className="glass flex h-11 w-11 items-center justify-center rounded-full" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? u("Ovozni o‘chirish") : u("Ovozni yoqish")}>
              {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
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
          <motion.section key={idx} className="flex h-full flex-col justify-center px-7 pb-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            {w ? (
              <>
                <p className="font-serif text-[22px] font-normal leading-[1.65] opacity-90">{w.join(" ")}</p>
                {idx === total - 1 && fin && <div className="mt-8"><ReactionBar t={t} /></div>}
              </>
            ) : (
              <>
                <span className="text-[13px] font-semibold text-clay">{catLabel(t.category, u, c)}</span>
                <h1 className="font-display mt-3 text-[38px] leading-[1.08] text-balance">{c(t.title)}</h1>
                <span className="mt-6 text-[13px] text-muted">{t.read_minutes} {u("daqiqa o‘qish")}</span>
              </>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  );
}
