import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark } from "lucide-react";
import type { Thought } from "../lib/api";
import { useApp } from "../store";
import { catLabel, ReactionBar } from "./ThoughtCard";

/** O‘qish tezligi (so‘z/daqiqa). Kartaning vaqti shundan hisoblanadi: katta qiymat = tezroq o‘tadi. */
const WPM = 180;
const WORD_MS = 60000 / WPM;
const TITLE_MS = 3500;
const CHUNK = 420; // bitta kartadagi belgilar chegarasi (jumla bo‘yicha bo‘linadi)
const HOLD_MS = 220; // shuncha bosib tursangiz — pauza

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
 * Chuqur o‘qish: scrollsiz, kartalar o‘zi almashadi. Tepada vaqt kamayib boradi,
 * o‘qilayotgan so‘z oqaradi va o‘qilgach so‘nadi. O‘ng/chap chetga bosing — keyingi/oldingi, bosib turing — pauza.
 */
export function Reader({ t, onClose }: { t: Thought; onClose: () => void }) {
  const { u, c, react } = useApp();
  const words = useMemo(() => c(t.body).split(/\n\s*\n/).flatMap((p) => chunk(p.trim())).filter(Boolean).map((p) => p.split(/\s+/)), [t.body, c]);
  const total = words.length + 1; // 0-karta: sarlavha
  const dur = useMemo(() => [TITLE_MS, ...words.map((w) => Math.max(2500, w.length * WORD_MS + 700))], [words]);

  const [idx, setIdx] = useState(0);
  const [wi, setWi] = useState(-1);
  const [secs, setSecs] = useState(Math.ceil(TITLE_MS / 1000));
  const [fin, setFin] = useState(false);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);

  const go = useCallback((i: number) => {
    if (i < 0 || i >= total) return;
    elapsed.current = 0;
    setWi(-1);
    setFin(false);
    setSecs(Math.ceil(dur[i]! / 1000));
    setIdx(i);
  }, [total, dur]);

  // Soat: so‘z indeksi va qolgan soniya yangilanadi; vaqt tugasa keyingi kartaga o‘tadi (oxirgisida to‘xtaydi).
  useEffect(() => {
    if (paused || fin) return;
    const d = dur[idx]!;
    const n = idx === 0 ? 0 : words[idx - 1]!.length;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const e = elapsed.current;
      if (n) setWi(Math.min(n - 1, Math.floor(e / WORD_MS)));
      setSecs(Math.max(0, Math.ceil((d - e) / 1000)));
      if (e >= d) {
        if (idx < total - 1) go(idx + 1);
        else setFin(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, paused, fin, dur, words, total, go]);

  // Bosish: chetlar — o‘tish; bosib turish — pauza.
  const holdTimer = useRef(0);
  const held = useRef(false);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    held.current = false;
    holdTimer.current = window.setTimeout(() => { held.current = true; setPaused(true); }, HOLD_MS);
  };
  const onUp = (e: React.PointerEvent) => {
    window.clearTimeout(holdTimer.current);
    if (held.current) { held.current = false; setPaused(false); return; }
    if ((e.target as HTMLElement).closest("button")) return;
    const r = e.currentTarget.getBoundingClientRect();
    go((e.clientX - r.left) / r.width < 0.35 ? idx - 1 : idx + 1);
  };
  const onCancel = () => { window.clearTimeout(holdTimer.current); if (held.current) { held.current = false; setPaused(false); } };
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  const w = idx > 0 ? words[idx - 1]! : null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-paper" role="dialog" aria-modal="true" aria-label={c(t.title)}>
      <div className="relative flex h-full w-full max-w-[560px] flex-col">
        <div className="px-5 pb-3 pt-[calc(10px+var(--safe-top))]">
          <div className="flex items-center justify-between">
            <button className="glass flex h-11 w-11 items-center justify-center rounded-full" onClick={onClose} aria-label={u("Orqaga")}><ArrowLeft size={20} /></button>
            <span className="text-[17px] font-semibold tabular-nums text-muted" aria-live="off">{fin ? "" : secs}</span>
            <button className={`flex h-11 w-11 items-center justify-center rounded-full ${t.saved ? "bg-clay text-onclay" : "glass"}`} aria-pressed={t.saved} aria-label={u("Saqlash")} onClick={() => react(t, "save")}>
              <Bookmark size={19} fill={t.saved ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => <span key={i} className={`h-[3px] flex-1 rounded-full ${i <= idx ? "bg-ink" : "bg-line"}`} />)}
          </div>
          {/* Joriy kartaning qolgan vaqti: to‘la chiziq kamayib boradi. */}
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden="true">
            {!fin && <div key={idx} className="fg-drain h-full bg-clay" style={{ animationDuration: `${dur[idx]}ms`, animationPlayState: paused ? "paused" : "running" }} />}
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
