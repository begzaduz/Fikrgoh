import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_MAIN, LOGO_STAR, LOGO_VIEWBOX } from "./Wordmark";

const EASE = [0.65, 0, 0.35, 1] as const;
const HOLD_MS = 1900; // logo to‘liq ko‘rinib bo‘lguncha

/**
 * Kirish ekrani: faqat logo (matn ham, tugma ham yo‘q). Logo asta paydo bo‘ladi, ma’lumot yuklangach "o" ichidagi
 * yulduz otilib kattalashadi va undan doira ochilib, bosh sahifaga o‘tiladi.
 */
export function Intro({ ready, onEnter }: { ready: boolean; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(false);
  const [held, setHeld] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const star = useRef<SVGPathElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setHeld(true), reduce ? 500 : HOLD_MS);
    return () => window.clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (!ready || !held || burst) return;
    if (reduce) return onEnter();
    const r = star.current?.getBoundingClientRect();
    if (r) setOrigin(`${r.left + r.width / 2}px ${r.top + r.height / 2}px`);
    setBurst(true);
  }, [ready, held, burst, reduce, onEnter]);

  const fade = { initial: { opacity: 0, filter: "blur(10px)" }, animate: burst ? { opacity: 0, filter: "blur(2px)", transition: { duration: 0.3 } } : { opacity: 1, filter: "blur(0px)", transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const } } };

  return (
    <motion.div className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-intro="" role="img" aria-label="fikrgoh">
      <div data-theme="dark" className="absolute inset-0 flex items-center justify-center bg-black">
        <svg viewBox={LOGO_VIEWBOX} className="w-[min(72vw,360px)] overflow-visible text-[#f5efe8]" fill="currentColor" aria-hidden="true">
          <motion.path fillRule="evenodd" d={LOGO_MAIN} {...fade} />
          <motion.path
            ref={star} d={LOGO_STAR}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={burst
              ? { scale: [1, 0.75, 9], rotate: [0, 0, 90], opacity: 1, transition: { duration: 0.7, times: [0, 0.25, 1], ease: "easeIn" } }
              : { scale: 1, rotate: 0, opacity: 1, transition: reduce ? { duration: 0.4 } : { type: "spring", stiffness: 150, damping: 11, delay: 0.8 } }}
          />
        </svg>
      </div>
      {burst && (
        <motion.div className="absolute inset-0" style={{ background: "var(--bg)", backgroundColor: "var(--paper)" }}
          initial={{ clipPath: `circle(0px at ${origin})` }} animate={{ clipPath: `circle(150vmax at ${origin})` }}
          transition={{ duration: 0.85, delay: 0.3, ease: EASE }} onAnimationComplete={onEnter} />
      )}
    </motion.div>
  );
}
