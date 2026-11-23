import { motion } from "framer-motion";
import { useApp } from "../store";
import { greeting } from "../lib/today";
import { Wordmark } from "./Wordmark";

const EASE = [0.76, 0, 0.24, 1] as const;
const LINES = ["Axborot emas.", "Fikr."];

/** Kirish ekrani: har doim qorong‘i mavzuda. Tugma bosilganda yuqoriga siljib ochiladi; ma’lumot yuklanguncha tugma o‘chiq. */
export function Intro({ ready, onEnter }: { ready: boolean; onEnter: () => void }) {
  const { u } = useApp();
  return (
    <motion.div data-theme="dark" className="fixed inset-0 z-[80] flex justify-center text-ink" style={{ background: "var(--bg)", backgroundColor: "var(--paper)" }} exit={{ y: "-100%" }} transition={{ duration: 0.6, ease: EASE }}>
      <div className="flex h-full w-full max-w-[560px] flex-col items-center px-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+var(--safe-top))]">
        <Wordmark className="h-[12px] w-auto text-ink opacity-80" />

        <div className="relative my-auto flex flex-col items-center text-center">
          <motion.div aria-hidden="true" className="absolute -top-24 h-52 w-52 blur-2xl" style={{ background: "radial-gradient(circle, var(--clay) 0%, transparent 68%)" }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0.25, 0.5, 0.25], scale: 1 }} transition={{ opacity: { duration: 4, repeat: Infinity }, scale: { duration: 1.2 } }} />
          <motion.p className="relative text-[15px] text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}>{u(greeting())}!</motion.p>
          <h1 className="font-display relative mt-4 text-[clamp(38px,12vw,56px)] leading-[1.05]">
            {LINES.map((l, i) => (
              <span key={l} className="block overflow-hidden pb-1">
                <motion.span className="block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.14 }}>{u(l)}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="relative mt-5 max-w-[24ch] font-serif text-[17px] leading-snug text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }}>
            {u("Shovqinda o‘z fikringni eshitish uchun joy.")}
          </motion.p>
        </div>

        <motion.button onClick={onEnter} disabled={!ready} aria-label={u("Kirish")} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}
          className="flex min-h-[58px] w-full items-center justify-center gap-3 rounded-full bg-clay text-[16px] font-bold text-onclay disabled:opacity-40">
          <span>{ready ? u("Kirish") : "…"}</span>
          <span aria-hidden="true">→</span>
        </motion.button>
        <p className="mt-4 text-[11px] text-muted">v {__BUILD__}</p>
      </div>
    </motion.div>
  );
}
