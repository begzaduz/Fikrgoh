import { useEffect, useRef, useState } from "react";
import { CATEGORY_LABEL, ReactionBar, ThoughtCard } from "../components/ThoughtCard";
import { tg } from "../lib/tg";
import { useApp } from "../store";

export function Home() {
  const { thoughts, search, markRead, u, c } = useApp();
  const [openId, setOpenId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const first = useRef(true);
  const open = thoughts.find((t) => t.id === openId) ?? null;

  // Qidiruv: 350 ms kutib yuboriladi. Eski va yangi alifbo bir xil natija beradi.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = window.setTimeout(() => search(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q, search]);

  // Fikr ochilganda o‘qilgan deb yoziladi (profil: ketma-ket kunlar, belgilar).
  useEffect(() => { if (openId !== null) markRead(openId); }, [openId, markRead]);

  // Telegram "Orqaga" tugmasi
  useEffect(() => {
    const back = tg()?.BackButton;
    if (!back || !open) return;
    const close = () => setOpenId(null);
    back.show();
    back.onClick(close);
    return () => { back.offClick(close); back.hide(); };
  }, [open]);

  const mono = "font-mono text-[11px] uppercase tracking-[0.14em]";
  if (open) {
    return (
      <article className="px-5 pb-14 pt-2">
        <button className={`flex min-h-[44px] items-center gap-2 text-muted ${mono}`} onClick={() => setOpenId(null)}>
          <span aria-hidden="true">←</span> {u("Orqaga")}
        </button>
        <span className={`mt-3 block text-clay ${mono}`}>{u(CATEGORY_LABEL[open.category])}</span>
        <h1 className="font-display mt-3 text-[46px] leading-[0.93] text-balance">{c(open.title)}</h1>
        <div className="mt-7 space-y-5 border-t border-ink pt-6 font-serif text-[18px] leading-[1.8] text-pretty">
          {c(open.body).split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-6 border-t border-line pt-1"><ReactionBar t={open} /></div>
      </article>
    );
  }

  return (
    <div className="px-5 pb-8 pt-3">
      <label className="flex min-h-[48px] items-center gap-3 border-b border-ink">
        <span className={`text-muted ${mono}`} aria-hidden="true">{u("Qidiruv")}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={u("Fikrlardan qidirish")} aria-label={u("Qidirish")}
          className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted" />
      </label>
      {thoughts.length === 0 && <p className="mt-6 text-sm text-muted">{u("Hozircha fikr topilmadi.")}</p>}
      <div className="mt-4">
        {thoughts.map((t, i) => <ThoughtCard key={t.id} t={t} index={i} onOpen={() => setOpenId(t.id)} />)}
      </div>
    </div>
  );
}
