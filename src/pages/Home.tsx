import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { DailyCard } from "../components/DailyCard";
import { CATEGORY_LABEL, ReactionBar, ThoughtCard } from "../components/ThoughtCard";
import { tg } from "../lib/tg";
import { useApp } from "../store";

export function Home() {
  const { thoughts, search, u, c } = useApp();
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

  // Telegram "Orqaga" tugmasi
  useEffect(() => {
    const back = tg()?.BackButton;
    if (!back || !open) return;
    const close = () => setOpenId(null);
    back.show();
    back.onClick(close);
    return () => { back.offClick(close); back.hide(); };
  }, [open]);

  if (open) {
    return (
      <article className="p-4 pb-10">
        <button className="flex min-h-[44px] items-center gap-1.5 text-sm text-muted" onClick={() => setOpenId(null)}>
          <ArrowLeft size={18} /> {u("Orqaga")}
        </button>
        <span className="mt-2 block text-[12px] font-semibold uppercase tracking-[1.5px] text-clay">{u(CATEGORY_LABEL[open.category])}</span>
        <h1 className="mt-2 font-serif text-[30px] font-bold leading-tight">{c(open.title)}</h1>
        <div className="mt-5 space-y-4 font-serif text-[19px] leading-relaxed">
          {c(open.body).split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <ReactionBar t={open} />
      </article>
    );
  }

  return (
    <div className="p-4">
      <DailyCard />
      <label className="mt-5 flex min-h-[44px] items-center gap-2 rounded-2xl border border-line bg-sand px-3.5">
        <Search size={18} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={u("Fikrlardan qidirish")} aria-label={u("Qidirish")}
          className="w-full bg-transparent text-base text-ink placeholder:text-muted" />
      </label>
      <h2 className="mt-5 font-serif text-xl font-semibold">{u("Fikrlar lentasi")}</h2>
      {thoughts.length === 0 && <p className="mt-4 text-sm text-muted">{u("Hozircha fikr topilmadi.")}</p>}
      {thoughts.map((t) => <ThoughtCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} />)}
    </div>
  );
}
