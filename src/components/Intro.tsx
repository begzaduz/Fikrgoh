import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_PARTS, LOGO_STAR, LOGO_VIEWBOX } from "./Wordmark";

const HOLD_MS = 3400; // logo to‘liq ko‘rinib turadigan eng kam vaqt
const OUT_S = 1.9;    // chiqish: yulduzga yaqinlashib o‘tish
const AQUA = "#7ee8d8";
const EXPO = [0.16, 1, 0.3, 1] as const;

// Fikrgoh fonidagi yulduz changi: har safar bir xil joylashadi (tasodifiy emas).
const DUST = (() => {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 38 }, () => ({ x: r() * 100, y: r() * 100, z: 1 + r() * 2.2, d: r() * 5, t: 3 + r() * 4 }));
})();

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/**
 * Kirish ekrani (faqat logo, matn va tugmasiz).
 * Kirish: shimoliy-nur fon yoritiladi, harflar ketma-ket ko‘tarilib chiqadi, "o" ichida yulduz tug‘iladi va undan to‘lqinlar tarqaladi.
 * Chiqish: yulduz yonib ketadi, kamera unga sho‘ng‘iydi, yorug‘lik ekranni to‘ldirib, bosh sahifa ochiladi.
 * onOpen — chiqish boshlanganda emas, parda ochila boshlaganda (orqadagi sahifa "joyiga tushishi" uchun); onEnter — butunlay tugaganda.
 */
export function Intro({ ready, onOpen, onEnter }: { ready: boolean; onOpen: () => void; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);
  const [held, setHeld] = useState(false);
  const [o, setO] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const star = useRef<SVGPathElement>(null);

  const measure = () => {
    const s = star.current?.getBoundingClientRect();
    const b = box.current?.getBoundingClientRect();
    if (s && b) setO({ x: s.left + s.width / 2 - b.left, y: s.top + s.height / 2 - b.top });
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
    const t = window.setTimeout(onOpen, OUT_S * 480);
    return () => window.clearTimeout(t);
  }, [out]); // eslint-disable-line react-hooks/exhaustive-deps

  const origin = `${o.x}px ${o.y}px`;
  const dust = useMemo(() => DUST, []);

  return (
    <motion.div className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-intro="" role="img" aria-label="fikrgoh">
      {/* ===== Fon ===== */}
      <motion.div data-theme="dark" className="absolute inset-0 overflow-hidden"
        style={{ backgroundColor: "#070a24", backgroundImage: "linear-gradient(160deg, #1b1f70 0%, #0c1038 52%, #060820 100%)" }}
        animate={{ opacity: out ? 0 : 1 }} transition={{ duration: 0.8, delay: out ? OUT_S * 0.42 : 0, ease: "easeInOut" }}>
        {/* Shimoliy nur: ikkita sekin suzuvchi nur */}
        <motion.div aria-hidden="true" className="absolute -left-1/4 -top-1/4 h-[85%] w-[110%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(129,140,248,.55), transparent)" }}
          initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: [-40, 40, -40], y: [0, 30, 0] }} transition={{ opacity: { duration: 1.6 }, x: { duration: 14, repeat: Infinity, ease: "easeInOut" }, y: { duration: 14, repeat: Infinity, ease: "easeInOut" } }} />
        <motion.div aria-hidden="true" className="absolute -bottom-1/3 -right-1/4 h-[80%] w-[110%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(45,212,191,.34), transparent)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1, x: [30, -30, 30], y: [20, -20, 20] }} transition={{ opacity: { duration: 2 }, x: { duration: 16, repeat: Infinity, ease: "easeInOut" }, y: { duration: 16, repeat: Infinity, ease: "easeInOut" } }} />
        {/* Yulduz changi */}
        <div aria-hidden="true" className="absolute inset-0">
          {dust.map((p, i) => (
            <i key={i} className="fg-tw absolute rounded-full bg-white" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.z, height: p.z, ["--d" as string]: `${p.d}s`, ["--t" as string]: `${p.t}s` }} />
          ))}
        </div>
        {/* Yulduz atrofidan yoyiladigan "fikr to‘lqinlari" */}
        {!reduce && [0, 1, 2].map((i) => (
          <motion.span key={i} aria-hidden="true" className="absolute rounded-full" style={{ left: o.x - 90, top: o.y - 90, width: 180, height: 180, border: `1px solid ${AQUA}` }}
            initial={{ opacity: 0, scale: 0.2 }} animate={out ? { opacity: 0 } : { opacity: [0, 0.5, 0], scale: [0.2, 7] }}
            transition={out ? { duration: 0.3 } : { duration: 5, delay: 1.3 + i * 1.6, repeat: Infinity, ease: "easeOut", times: [0, 0.12, 1] }} />
        ))}
        {/* Mayin donadorlik: tekis rang "yopishib" qolmasligi uchun */}
        <div aria-hidden="true" className="absolute inset-0 opacity-[.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      </motion.div>

      {/* ===== Logo ===== */}
      <div ref={box} className="absolute inset-0 flex items-center justify-center">
        <motion.div style={{ transformOrigin: origin, color: "#f4f7ff" }}
          animate={out ? { scale: [1, 0.93, 90] } : { scale: 1 }}
          transition={out ? { duration: OUT_S, times: [0, 0.2, 1], ease: ["easeOut", [0.8, 0, 0.95, 0.4]] } : { duration: 0 }}
          onAnimationComplete={() => out && onEnter()}>
          <svg viewBox={LOGO_VIEWBOX} className="block w-[min(46vw,210px)] overflow-visible" fill="currentColor" aria-hidden="true">
            {LOGO_PARTS.map((p, i) => (
              <motion.path key={p.id} d={p.d} fillRule="evenodd"
                initial={{ opacity: 0, y: 46, filter: "blur(10px)" }}
                animate={out ? { opacity: 0, y: 0, filter: "blur(0px)" } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={out ? { duration: 0.55, delay: 0.25 } : { duration: 1.1, delay: 0.5 + i * 0.07, ease: EXPO }} />
            ))}
            {/* Yulduz: "o" bilan birga tug‘iladi, so‘ng nafas oladi; chiqishda yonib kattalashadi */}
            <motion.path ref={star} d={LOGO_STAR} style={{ transformBox: "fill-box", transformOrigin: "center", filter: `drop-shadow(0 0 10px ${AQUA})` }}
              initial={{ scale: 0, rotate: -120, opacity: 0, fill: AQUA }}
              animate={out
                ? { scale: [1, 1.6], rotate: 0, opacity: 1, fill: "#ffffff", transition: { duration: 0.4, ease: "easeOut" } }
                : { scale: reduce ? 1 : [0, 1.35, 1, 1.12, 1], rotate: 0, opacity: 1, fill: AQUA,
                    transition: reduce ? { duration: 0.4 } : { scale: { duration: 4.2, times: [0, 0.2, 0.34, 0.65, 1], delay: 0.5 + 5 * 0.07, repeat: Infinity, repeatDelay: 0, ease: "easeInOut" }, rotate: { duration: 1.1, delay: 0.85, ease: EXPO }, opacity: { duration: 0.5, delay: 0.85 } } }} />
          </svg>
        </motion.div>
      </div>

      {/* ===== Chiqish: yorug‘lik portlashi ===== */}
      {out && (
        <motion.div aria-hidden="true" className="pointer-events-none absolute rounded-full"
          style={{ left: o.x - 60, top: o.y - 60, width: 120, height: 120, background: `radial-gradient(closest-side, #fff 0%, ${AQUA} 38%, rgba(126,232,216,0) 72%)` }}
          initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 0, 0.95, 0], scale: [0.2, 0.6, 34, 48] }}
          transition={{ duration: OUT_S, times: [0, 0.45, 0.78, 1], ease: "easeIn" }} />
      )}
    </motion.div>
  );
}
