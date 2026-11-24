import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_PARTS, LOGO_STAR, LOGO_VIEWBOX } from "./Wordmark";

const HOLD_MS = 3400; // logo to‘liq ko‘rinib turadigan eng kam vaqt
const OUT_S = 1.7;    // chiqish: yulduzga yaqinlashib bosh sahifaga o‘tish
const EXPO = [0.16, 1, 0.3, 1] as const;

// Donador (noise) tekstura: tekis rang "yopishib" qolmasligi uchun.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/**
 * Kirish ekrani (faqat logo, matn va tugmasiz). Fon: indigo + aqua nurlar ustida donador (noise) tekstura.
 * Kirish: harflar ketma-ket ko‘tarilib chiqadi (yulduz "o" bilan birga, logoning o‘z rangida).
 * Chiqish: kamera "o" ichidagi yulduzga yaqinlashadi, fon so‘nib bosh sahifa ochiladi (logo siljib ketmaydi).
 */
export function Intro({ ready, onOpen, onEnter }: { ready: boolean; onOpen: () => void; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);
  const [held, setHeld] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const logo = useRef<HTMLDivElement>(null);
  const star = useRef<SVGPathElement>(null);

  /** Yaqinlashish markazi: yulduz markazi, logo qutisiga nisbatan (transform-origin shu qutiga nisbatan o‘lchanadi). */
  const measure = () => {
    const s = star.current?.getBoundingClientRect();
    const b = logo.current?.getBoundingClientRect();
    if (s && b) setOrigin(`${s.left + s.width / 2 - b.left}px ${s.top + s.height / 2 - b.top}px`);
  };
  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setHeld(true), reduce ? 700 : HOLD_MS);
    return () => window.clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (!ready || !held || out) return;
    if (reduce) { onOpen(); onEnter(); return; }
    measure();
    setOut(true);
  }, [ready, held, out, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!out) return;
    const t = window.setTimeout(onOpen, OUT_S * 450);
    return () => window.clearTimeout(t);
  }, [out]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-intro="" role="img" aria-label="fikrgoh">
      {/* ===== Fon ===== */}
      <motion.div data-theme="dark" className="absolute inset-0 overflow-hidden"
        style={{ backgroundColor: "#070a24", backgroundImage: "linear-gradient(160deg, #1b1f70 0%, #0c1038 52%, #060820 100%)" }}
        animate={{ opacity: out ? 0 : 1 }} transition={{ duration: 0.7, delay: out ? OUT_S * 0.5 : 0, ease: "easeInOut" }}>
        <motion.div aria-hidden="true" className="absolute -left-1/4 -top-1/4 h-[85%] w-[110%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(129,140,248,.5), transparent)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-30, 30, -30], y: [0, 24, 0] }} transition={{ opacity: { duration: 1.6 }, x: { duration: 16, repeat: Infinity, ease: "easeInOut" }, y: { duration: 16, repeat: Infinity, ease: "easeInOut" } }} />
        <motion.div aria-hidden="true" className="absolute -bottom-1/3 -right-1/4 h-[80%] w-[110%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(45,212,191,.3), transparent)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1, x: [24, -24, 24], y: [16, -16, 16] }} transition={{ opacity: { duration: 2 }, x: { duration: 18, repeat: Infinity, ease: "easeInOut" }, y: { duration: 18, repeat: Infinity, ease: "easeInOut" } }} />
        {/* Noise: ikki qatlam (yorug‘lik ustiga singib + yengil qoplama) */}
        <div aria-hidden="true" className="absolute inset-0 opacity-[.22] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        <div aria-hidden="true" className="absolute inset-0 opacity-[.05]" style={{ backgroundImage: GRAIN, backgroundSize: "140px 140px" }} />
      </motion.div>

      {/* ===== Logo ===== */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div ref={logo} style={{ transformOrigin: origin, color: "#f4f7ff" }}
          animate={out ? { scale: 80, opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }}
          transition={out ? { scale: { duration: OUT_S, ease: [0.7, 0, 0.9, 0.35] }, opacity: { duration: OUT_S, times: [0, 0.6, 1] } } : { duration: 0 }}
          onAnimationComplete={() => out && onEnter()}>
          <svg viewBox={LOGO_VIEWBOX} className="block w-[min(46vw,210px)] overflow-visible" fill="currentColor" aria-hidden="true">
            {LOGO_PARTS.map((p, i) => (
              <motion.path key={p.id} d={p.d} fillRule="evenodd"
                initial={{ opacity: 0, y: 46, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.1, delay: 0.5 + i * 0.07, ease: EXPO }} />
            ))}
            <motion.path ref={star} d={LOGO_STAR} initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.1, delay: 0.5 + 5 * 0.07, ease: EXPO }} />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
