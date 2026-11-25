import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { Thought } from "../lib/api";
import { useApp } from "../store";
import { catLabel, ReactionBar } from "./ThoughtCard";

/** Asosiy o‘qish tezligi (so‘z/daqiqa, 1×). Foydalanuvchi tepadagi tugma bilan 0.5×–1.25× oralig‘ida o‘zgartiradi. */
const WPM = 160;
const WORD_MS = 60000 / WPM;
const SPEEDS = [0.5, 0.75, 1, 1.25] as const;
const SPEED_KEY = "fg-speed";
const loadSpeed = (): number => {
  try { const v = Number(localStorage.getItem(SPEED_KEY)); return (SPEEDS as readonly number[]).includes(v) ? v : 0.75; } catch { return 0.75; }
};
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
 * o‘qilayotgan so‘z oqaradi va o‘qilgach so‘nadi. Bosib turing — pauza; tezlik tugmasi tepada.
 */
export function Reader({ t, onClose }: { t: Thought; onClose: () => void }) {
  const { u, c } = useApp();
  const words = useMemo(() => c(t.body).split(/\n\s*\n/).flatMap((p) => chunk(p.trim())).filter(Boolean).map((p) => p.split(/\s+/)), [t.body, c]);
  const total = words.length + 1; // 0-karta: sarlavha
  const dur = useMemo(() => [TITLE_MS, ...words.map((w) => Math.max(2500, w.length * WORD_MS + 700))], [words]);

  const [idx, setIdx] = useState(0);
  const [wi, setWi] = useState(-1);
  const [speed, setSpeed] = useState(loadSpeed);
  const [secs, setSecs] = useState(() => Math.ceil(dur.reduce((a, b) => a + b, 0) / loadSpeed() / 1000));
  const bar = useRef<HTMLDivElement>(null);
  const after = useMemo(() => dur.map((_, i) => dur.slice(i + 1).reduce((a, b) => a + b, 0)), [dur]); // keyingi kartalar vaqti
  const totalMs = after[0]! + dur[0]!;
  const [fin, setFin] = useState(false);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);

  const go = useCallback((i: number) => {
    if (i < 0 || i >= total) return;
    elapsed.current = 0;
    setWi(-1);
    setFin(false);
    setIdx(i);
  }, [total]);

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]!;
    setSpeed(next);
    try { localStorage.setItem(SPEED_KEY, String(next)); } catch { /* saqlanmasa ham ishlayveradi */ }
  };

  // Soat: so‘z indeksi va qolgan soniya yangilanadi; vaqt tugasa keyingi kartaga o‘tadi (oxirgisida to‘xtaydi).
  useEffect(() => {
    if (paused || fin) return;
    const d = dur[idx]!;
    const n = idx === 0 ? 0 : words[idx - 1]!.length;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      elapsed.current += (now - last) * speed; // vaqt "asosiy" millisekundda; tezlik o‘zgarsa ham ravon davom etadi
      last = now;
      const e = elapsed.current;
      if (n) setWi(Math.min(n - 1, Math.floor(e / WORD_MS)));
      const left = Math.max(0, d - e) + after[idx]!; // butun matn bo‘yicha qolgan vaqt
      setSecs(Math.ceil(left / speed / 1000));
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
  }, [idx, paused, fin, dur, words, total, go, speed, after, totalMs]);

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
            <button className="glass flex h-11 min-w-[56px] items-center justify-center rounded-full px-3 text-[14px] font-semibold tabular-nums" onClick={cycleSpeed} aria-label={`${u("Tezlik")}: ${speed}×`}>
              {speed}×
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
                <p className="font-serif text-[22px] font-normal leading-[1.65]">
                  {w.map((x, i) => {
                    const on = i === wi;
                    // Joriy so‘z tez oqaradi, o‘qilgach sekin so‘nadi; o‘qilmaganlari xira.
                    const o = fin ? 1 : on ? 1 : i < wi ? 0.45 : 0.25;
                    return <span key={i} style={{ opacity: o, transition: `opacity ${on ? 120 : 900}ms ease-out` }}>{x}{" "}</span>;
                  })}
                </p>
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
