import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_PARTS, LOGO_STAR, LOGO_VIEWBOX } from "./Wordmark";

const REVEAL_MS = 1850;
const EXIT_MS = 420;
const EASE = [0.16, 1, 0.3, 1] as const;

/** Fikrgoh intro: avval "o" ichidagi yulduz uyg'onadi, so'ng wordmark ochiladi. */
export function Intro({ ready, onOpen, onEnter }: { ready: boolean; onOpen: () => void; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setOut(true), reduce ? 100 : REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [ready, reduce]);

  useEffect(() => {
    if (!out) return;
    onOpen();
    const t = window.setTimeout(onEnter, reduce ? 0 : EXIT_MS);
    return () => window.clearTimeout(t);
  }, [out, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const letters = {
    hidden: { opacity: 0, y: 9, filter: "blur(5px)" },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.62, delay: 0.42 + i * 0.075, ease: EASE },
    }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      data-intro=""
      role="img"
      aria-label="fikrgoh"
    >
      <motion.div
        data-theme="dark"
        className="absolute inset-0 overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 50% 48%, #252b42 0%, #171d31 38%, #101522 100%)" }}
        animate={{ opacity: out ? 0 : 1 }}
        transition={{ duration: 0.42, delay: 0.08, ease: "easeInOut" }}
      >
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[min(72vw,360px)] w-[min(72vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(225,196,143,.13) 0%, rgba(225,196,143,.045) 34%, transparent 70%)" }}
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: out ? 0 : [0.35, 0.8, 0.55], scale: out ? 1.65 : [0.55, 1, 1.08] }}
          transition={{ duration: out ? 0.42 : 1.7, ease: EASE }}
        />
        <div aria-hidden="true" className="absolute inset-0 opacity-[.035]"
          style={{ backgroundImage: "radial-gradient(#fff 0.55px, transparent 0.55px)", backgroundSize: "5px 5px" }} />
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg
          viewBox={LOGO_VIEWBOX}
          className="block w-[min(52vw,238px)] overflow-visible"
          fill="currentColor"
          aria-hidden="true"
          style={{ color: "#f4f0e8" }}
          initial={reduce ? false : { opacity: 1, scale: 0.97 }}
          animate={{ opacity: out ? 0 : 1, scale: out ? 0.94 : 1 }}
          transition={{ duration: out ? 0.32 : 0.7, ease: EASE }}
        >
          {/* Yulduz birinchi bo'lib, o'z markazidan uyg'onadi. */}
          <motion.path
            d={LOGO_STAR}
            style={{ fill: "#e5c58f", transformBox: "view-box", transformOrigin: "1459px 352px" }}
            initial={reduce ? false : { opacity: 0, scale: 0.18, rotate: -35 }}
            animate={out ? { opacity: 0, scale: 1.8, rotate: 22 } : { opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: out ? 0.3 : 0.72, delay: out ? 0 : 0.08, ease: EASE }}
          />
          {LOGO_PARTS.map((part, index) => (
            <motion.path
              key={part.id}
              d={part.d}
              fillRule="evenodd"
              variants={letters}
              custom={index}
              initial={reduce ? false : "hidden"}
              animate={out ? { opacity: 0, y: -3, filter: "blur(3px)" } : "show"}
              transition={out ? { duration: 0.2, ease: "easeIn" } : undefined}
            />
          ))}
        </motion.svg>
      </div>
    </motion.div>
  );
}
