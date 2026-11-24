import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { LOGO_PARTS, LOGO_STAR, LOGO_VIEWBOX } from "./Wordmark";

const HOLD_MS = 2400;  // logo ochila boshlagandan keyin chiqish boshlanguncha (eng kam)
const IN_S = 1.2;      // logo "ochilishi": chapdan o‘ngga yumshoq chegarali supurish
const OUT_S = 0.85;    // logo "yopilishi": xuddi shu yo‘nalishda
const BG_OUT = 0.7;    // fon so‘nib, bosh sahifa ochilishi
const EDGE = 30;       // supurish chegarasining yumshoqligi (%)
const END = 100 + EDGE;
const EASE = [0.45, 0, 0.2, 1] as const;

// Donador (noise) tekstura: tekis rang "yopishib" qolmasligi uchun.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/**
 * Kirish ekrani (faqat logo, matn va tugmasiz): noise fonda logo chapdan o‘ngga yumshoq "supurish" bilan ochiladi
 * (biroz kattalashib, xiralikdan aniqlashib), ma’lumot yuklangach shu yo‘nalishda yopiladi va bosh sahifa ochiladi.
 */
export function Intro({ ready, onOpen, onEnter }: { ready: boolean; onOpen: () => void; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);
  const [held, setHeld] = useState(false);
  const pin = useMotionValue(reduce ? END : 0);   // ochilish chizig‘i
  const pout = useMotionValue(0);                 // yopilish chizig‘i

  const mask = useTransform([pin, pout], ([a, b]: number[]) =>
    `linear-gradient(90deg, transparent ${b - EDGE}%, #000 ${b}%, #000 ${a - EDGE}%, transparent ${a}%)`);
  const scale = useTransform([pin, pout], ([a, b]: number[]) => (0.96 + 0.04 * Math.min(a / END, 1)) * (1 + 0.025 * Math.min(b / END, 1)));
  const filter = useTransform(pin, (a: number) => `blur(${(8 * (1 - Math.min(a / END, 1))).toFixed(2)}px)`);

  useEffect(() => {
    if (reduce) return;
    const c = animate(pin, END, { duration: IN_S, delay: 0.25, ease: EASE });
    return () => c.stop();
  }, [reduce, pin]);

  useEffect(() => {
    const t = window.setTimeout(() => setHeld(true), reduce ? 700 : HOLD_MS);
    return () => window.clearTimeout(t);
  }, [reduce]);

  // Chiqishni boshlash: faqat bir marta (cleanup animatsiyani to‘xtatib qo‘ymasligi uchun alohida effektlar).
  useEffect(() => {
    if (!ready || !held || out) return;
    if (reduce) { onOpen(); onEnter(); return; }
    setOut(true);
  }, [ready, held, out, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!out) return;
    const c = animate(pout, END, { duration: OUT_S, ease: EASE });
    const t = window.setTimeout(onOpen, OUT_S * 450);
    return () => { c.stop(); window.clearTimeout(t); };
  }, [out]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-intro="" role="img" aria-label="fikrgoh">
      {/* ===== Fon ===== */}
      <motion.div data-theme="dark" className="absolute inset-0 overflow-hidden"
        style={{ backgroundColor: "#070a24", backgroundImage: "linear-gradient(160deg, #1b1f70 0%, #0c1038 52%, #060820 100%)" }}
        animate={{ opacity: out ? 0 : 1 }} transition={{ duration: BG_OUT, delay: out ? OUT_S * 0.55 : 0, ease: "easeInOut" }}
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

      {/* ===== Logo: yumshoq supurish bilan ochiladi / yopiladi ===== */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg viewBox={LOGO_VIEWBOX} className="block w-[min(46vw,210px)]" fill="currentColor" aria-hidden="true"
          style={{ color: "#f4f7ff", maskImage: mask, WebkitMaskImage: mask, scale, filter }}>
          {LOGO_PARTS.map((p) => <path key={p.id} d={p.d} fillRule="evenodd" />)}
          <path d={LOGO_STAR} />
        </motion.svg>
      </div>
    </motion.div>
  );
}
