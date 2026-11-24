import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_PARTS, LOGO_STAR, LOGO_VIEWBOX } from "./Wordmark";

const HOLD_MS = 1100;  // chiqish boshlanguncha (eng kam), logo ochilishini ham o‘z ichiga oladi
const IN_S = 0.6;      // focus in: loyqadan aniqlikka
const OUT_S = 0.4;     // focus out: aniqlikdan loyqaga
const BG_OUT = 0.3;    // fon so‘nib, bosh sahifa ochilishi
const EASE = [0.22, 1, 0.36, 1] as const;

// Donador (noise) tekstura: tekis rang "yopishib" qolmasligi uchun.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/**
 * Kirish ekrani (faqat logo, matn va tugmasiz): noise fonda logo "fokusga keladi" (focus in: kuchli loyqadan aniqlikka, biroz kichrayib),
 * ma’lumot yuklangach fokusdan chiqadi (focus out: loyqalanib so‘nadi) va bosh sahifa ochiladi.
 */
export function Intro({ ready, onOpen, onEnter }: { ready: boolean; onOpen: () => void; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setHeld(true), reduce ? 700 : HOLD_MS);
    return () => window.clearTimeout(t);
  }, [reduce]);

  // Chiqishni boshlash: bir marta (cleanup taymerni bekor qilib qo‘ymasligi uchun alohida effektlar).
  useEffect(() => {
    if (!ready || !held || out) return;
    if (reduce) { onOpen(); onEnter(); return; }
    setOut(true);
  }, [ready, held, out, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!out) return;
    const t = window.setTimeout(onOpen, OUT_S * 500);
    return () => window.clearTimeout(t);
  }, [out]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-intro="" role="img" aria-label="fikrgoh">
      {/* ===== Fon ===== */}
      <motion.div data-theme="dark" className="absolute inset-0 overflow-hidden"
        style={{ backgroundColor: "#070a24", backgroundImage: "linear-gradient(160deg, #1b1f70 0%, #0c1038 52%, #060820 100%)" }}
        animate={{ opacity: out ? 0 : 1 }} transition={{ duration: BG_OUT, delay: out ? OUT_S * 0.5 : 0, ease: "easeInOut" }}
        onAnimationComplete={() => out && onEnter()}>
        <motion.div aria-hidden="true" className="absolute -left-1/4 -top-1/4 h-[85%] w-[110%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(129,140,248,.5), transparent)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-30, 30, -30], y: [0, 24, 0] }} transition={{ opacity: { duration: 1.6 }, x: { duration: 16, repeat: Infinity, ease: "easeInOut" }, y: { duration: 16, repeat: Infinity, ease: "easeInOut" } }} />
        <motion.div aria-hidden="true" className="absolute -bottom-1/3 -right-1/4 h-[80%] w-[110%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(45,212,191,.3), transparent)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1, x: [24, -24, 24], y: [16, -16, 16] }} transition={{ opacity: { duration: 2 }, x: { duration: 18, repeat: Infinity, ease: "easeInOut" }, y: { duration: 18, repeat: Infinity, ease: "easeInOut" } }} />
        {/* Noise: ikki qatlam (yorug‘lik ustiga singib + qoplama) */}
        <div aria-hidden="true" className="absolute inset-0 opacity-[.45] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        <div aria-hidden="true" className="absolute inset-0 opacity-[.1]" style={{ backgroundImage: GRAIN, backgroundSize: "140px 140px" }} />
      </motion.div>

      {/* ===== Logo: focus in / focus out ===== */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg viewBox={LOGO_VIEWBOX} className="block w-[min(46vw,210px)] overflow-visible" fill="currentColor" aria-hidden="true" style={{ color: "#f4f7ff" }}
          initial={reduce ? false : { opacity: 0, filter: "blur(28px)", scale: 1.1 }}
          animate={out ? { opacity: 0, filter: "blur(24px)", scale: 1.05 } : { opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={out ? { duration: OUT_S, ease: "easeIn" } : { duration: IN_S, delay: 0.05, ease: EASE }}>
          {LOGO_PARTS.map((p) => <path key={p.id} d={p.d} fillRule="evenodd" />)}
          <path d={LOGO_STAR} />
        </motion.svg>
      </div>
    </motion.div>
  );
}
