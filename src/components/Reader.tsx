import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";
import type { Thought } from "../lib/api";
import { useApp } from "../store";
import { catLabel, ReactionBar } from "./ThoughtCard";

/** Uzun abzasni jumlalar bo‘yicha ~230 belgigacha bo‘laklarga bo‘ladi: har kartada bitta g‘oya. */
function chunk(p: string, max = 230): string[] {
  if (p.length <= max) return [p];
  const out: string[] = [];
  let cur = "";
  for (const s of p.match(/[^.!?…]+[.!?…]+["”’»]?\s*|[^.!?…]+$/g) ?? [p]) {
    if (cur && (cur + s).length > max) { out.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Chuqur o‘qish: to‘liq ekranli kartalar, scroll bilan keyingisiga o‘tiladi. Hech qanday chalg‘ituvchi element yo‘q. */
export function Reader({ t, onClose }: { t: Thought; onClose: () => void }) {
  const { u, c, react } = useApp();
  const box = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const parts = useMemo(() => c(t.body).split(/\n\s*\n/).flatMap((p) => chunk(p.trim())).filter(Boolean), [t.body, c]);
  const total = parts.length + 1; // 0-karta: sarlavha

  const onScroll = () => {
    const el = box.current;
    if (el) setIdx(Math.min(total - 1, Math.round(el.scrollTop / el.clientHeight)));
  };
  const go = (i: number) => box.current?.scrollTo({ top: i * box.current.clientHeight, behavior: "smooth" });

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-paper" role="dialog" aria-modal="true" aria-label={c(t.title)}>
      <div className="relative flex h-full w-full max-w-[560px] flex-col">
        <div className="px-5 pb-3 pt-[calc(10px+var(--safe-top))]">
          <div className="flex items-center justify-between">
            <button className="glass flex h-11 w-11 items-center justify-center rounded-full" onClick={onClose} aria-label={u("Orqaga")}><ArrowLeft size={20} /></button>
            <button className={`flex h-11 w-11 items-center justify-center rounded-full ${t.saved ? "bg-clay text-onclay" : "glass"}`} aria-pressed={t.saved} aria-label={u("Saqlash")} onClick={() => react(t, "save")}>
              <Bookmark size={19} fill={t.saved ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <button key={i} tabIndex={-1} onClick={() => go(i)} className="h-4 flex-1">
                <span className={`block h-[3px] rounded-full transition-colors ${i <= idx ? "bg-ink" : "bg-line"}`} />
              </button>
            ))}
          </div>
        </div>

        <div ref={box} onScroll={onScroll} className="no-scrollbar min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
          <section className="flex h-full snap-start snap-always flex-col justify-center px-7 pb-16">
            <span className="text-[13px] font-semibold text-clay">{catLabel(t.category, u, c)}</span>
            <h1 className="font-display mt-3 text-[38px] leading-[1.08] text-balance">{c(t.title)}</h1>
            <span className="mt-6 text-[13px] text-muted">{t.read_minutes} {u("daqiqa o‘qish")}</span>
          </section>
          {parts.map((p, i) => (
            <section key={i} className="flex h-full snap-start snap-always flex-col justify-center px-7 pb-16">
              <p className="font-serif text-[22px] font-normal leading-[1.65] text-pretty">{p}</p>
              {i === parts.length - 1 && <div className="mt-8"><ReactionBar t={t} /></div>}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
