import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, X } from "lucide-react";
import { getFeed, type Thought } from "../lib/api";
import { tg } from "../lib/tg";
import { useApp } from "../store";
import { CATEGORY_LABEL } from "./ThoughtCard";

type State = "idle" | "loading" | "done" | "error";

/** To‘liq ekranli qidiruv oynasi: yozganingiz sari natijalar shu yerning o‘zida chiqadi. */
export function SearchSheet({ onClose, onPick }: { onClose: () => void; onPick: (t: Thought) => void }) {
  const { u, c } = useApp();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Thought[]>([]);
  const [state, setState] = useState<State>("idle");
  const seq = useRef(0);
  const term = q.trim();

  useEffect(() => {
    const id = ++seq.current;
    if (term.length < 2) { setRows([]); setState("idle"); return; }
    setState("loading");
    const t = window.setTimeout(() => {
      getFeed(term)
        .then((r) => { if (id === seq.current) { setRows(r); setState("done"); } })
        .catch(() => { if (id === seq.current) setState("error"); });
    }, 300);
    return () => window.clearTimeout(t);
  }, [term]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const back = tg()?.BackButton;
    back?.show();
    back?.onClick(onClose);
    return () => { window.removeEventListener("keydown", onKey); back?.offClick(onClose); back?.hide(); };
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-center bg-paper/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={u("Qidirish")}
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
      <div className="flex h-full w-full max-w-[560px] flex-col">
        <div className="flex items-center gap-2 px-4 pb-3 pt-[calc(10px+var(--safe-top))]">
          <button onClick={onClose} aria-label={u("Orqaga")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink">
            <ArrowLeft size={24} />
          </button>
          <label className="glass flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full pl-4 pr-1.5">
            <Search size={19} className="shrink-0 text-muted" aria-hidden="true" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={u("Fikrlardan qidirish")} aria-label={u("Qidirish")}
              enterKeyHint="search" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted" />
            {q && (
              <button onClick={() => setQ("")} aria-label={u("Tozalash")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand text-muted">
                <X size={17} />
              </button>
            )}
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10">
          {state === "idle" && (
            <div className="mt-16 flex flex-col items-center text-center text-muted">
              <span className="glass flex h-16 w-16 items-center justify-center rounded-full"><Search size={26} /></span>
              <p className="mt-4 text-[15px]">{u("Sarlavha yoki so‘z yozing")}</p>
            </div>
          )}
          {state === "loading" && [0, 1, 2].map((i) => <div key={i} className="glass mt-3 h-[92px] animate-pulse rounded-[22px]" />)}
          {state === "error" && <p className="mt-10 text-center text-[15px] text-muted">{u("Qidirib bo‘lmadi. Internetni tekshiring.")}</p>}
          {state === "done" && rows.length === 0 && (
            <p className="mt-10 text-center text-[15px] text-muted">{u("Hech narsa topilmadi.")}</p>
          )}
          {state === "done" && rows.map((t) => (
            <button key={t.id} onClick={() => onPick(t)} className="glass mt-3 block w-full rounded-[22px] p-4 text-left">
              <span className="flex items-center gap-2 text-[12px] font-semibold text-clay">
                {u(CATEGORY_LABEL[t.category])}
                <span className="font-normal text-muted">· {t.read_minutes} {u("daqiqa o‘qish")}</span>
              </span>
              <span className="mt-1.5 block text-[18px] font-semibold leading-[1.25]">{c(t.title)}</span>
              <span className="mt-1.5 line-clamp-2 block font-serif text-[14px] leading-relaxed text-muted">{c(t.body).split("\n\n")[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
