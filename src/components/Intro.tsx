import { motion } from "framer-motion";
import { useApp } from "../store";
import { Wordmark } from "./Wordmark";

const EASE = [0.76, 0, 0.24, 1] as const;
const LINES = ["Axborot", "emas.", "Fikr."];

/** Ilovaga kirishdan oldingi ekran: tugma bosilganda yuqoriga siljib ochiladi. Ma’lumot yuklanguncha tugma o‘chiq turadi. */
export function Intro({ ready, onEnter }: { ready: boolean; onEnter: () => void }) {
  const { u } = useApp();
  return (
    <motion.div className="fixed inset-0 z-[80] flex justify-center bg-clay text-onclay" exit={{ y: "-100%" }} transition={{ duration: 0.6, ease: EASE }}>
      <div className="flex h-full w-full max-w-[560px] flex-col px-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[calc(20px+var(--safe-top))]">
        <div className="flex items-center justify-between">
          <Wordmark className="h-[13px] w-auto" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-70">v {__BUILD__}</span>
        </div>

        <h1 className="font-display mt-auto text-[clamp(76px,25vw,136px)] uppercase leading-[0.86]">
          {LINES.map((l, i) => (
            <span key={l} className="block overflow-hidden">
              <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.12 }}>
                {u(l)}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p className="mt-7 max-w-[26ch] font-serif text-[18px] leading-snug" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}>
          {u("Shovqinda o‘z fikringni eshitish uchun joy.")}
        </motion.p>

        <motion.button onClick={onEnter} disabled={!ready} aria-label={u("Kirish")}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-8 flex min-h-[58px] w-full items-center justify-between bg-onclay px-5 font-mono text-[13px] uppercase tracking-[0.16em] text-clay disabled:opacity-40">
          <span>{ready ? u("Kirish") : "…"}</span>
          <span aria-hidden="true">→</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
