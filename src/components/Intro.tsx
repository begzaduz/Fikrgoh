import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_MAIN, LOGO_STAR, LOGO_VIEWBOX } from "./Wordmark";

const HOLD_MS = 3200;     // logo ko‘rinib turadigan vaqt
const ZOOM_S = 1.5;       // yulduzga yaqinlashish davomiyligi

/**
 * Kirish ekrani: faqat logo (matn ham, tugma ham yo‘q), fon Fikrgoh ranglarida (indigo + aqua).
 * Logo yulduzi bilan birga paydo bo‘ladi. Ma’lumot yuklangach kamera "o" ichidagi yulduzga yaqinlashadi va bosh sahifa ochiladi.
 */
export function Intro({ ready, onEnter }: { ready: boolean; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(false);
  const [held, setHeld] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const box = useRef<HTMLDivElement>(null);
  const star = useRef<SVGPathElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setHeld(true), reduce ? 600 : HOLD_MS);
    return () => window.clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (!ready || !held || burst) return;
    if (reduce) return onEnter();
    const s = star.current?.getBoundingClientRect();
    const b = box.current?.getBoundingClientRect();
    if (s && b) setOrigin(`${s.left + s.width / 2 - b.left}px ${s.top + s.height / 2 - b.top}px`);
    setBurst(true);
  }, [ready, held, burst, reduce, onEnter]);

  return (
    <motion.div className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-intro="" role="img" aria-label="fikrgoh">
      {/* Fon: ilovaning o‘z fon rangi (Fikrgoh: indigo + aqua). Yaqinlashish oxirida so‘nib, orqadagi bosh sahifani ochadi. */}
      <motion.div data-theme="dark" className="absolute inset-0" style={{ background: "var(--bg)", backgroundColor: "var(--paper)" }}
        animate={{ opacity: burst ? 0 : 1 }} transition={{ duration: 0.7, delay: burst ? ZOOM_S * 0.55 : 0 }} />
      <div ref={box} className="absolute inset-0 flex items-center justify-center">
        <motion.div data-theme="dark" className="text-ink" style={{ transformOrigin: origin }}
          animate={burst ? { scale: 70, opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }}
          transition={burst ? { scale: { duration: ZOOM_S, ease: [0.7, 0, 0.84, 0] }, opacity: { duration: ZOOM_S, times: [0, 0.6, 1] } } : { duration: 0 }}
          onAnimationComplete={() => burst && onEnter()}>
          <motion.svg viewBox={LOGO_VIEWBOX} className="block w-[min(46vw,210px)] overflow-visible" fill="currentColor" aria-hidden="true"
            initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}>
            <path fillRule="evenodd" d={LOGO_MAIN} />
            <motion.path ref={star} d={LOGO_STAR} style={{ transformBox: "fill-box", transformOrigin: "center" }}
              animate={burst || reduce ? { scale: 1 } : { scale: [1, 1.14, 1] }}
              transition={burst || reduce ? { duration: 0.2 } : { duration: 2.4, repeat: Infinity, delay: 1.3, ease: "easeInOut" }} />
          </motion.svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
