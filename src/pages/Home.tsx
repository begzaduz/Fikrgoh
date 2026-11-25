import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CATEGORY_LABEL, catLabel, ReactionBar, ThoughtCard } from "../components/ThoughtCard";
import type { Category } from "../lib/api";
import { tg } from "../lib/tg";
import { useApp } from "../store";

type Filter = "all" | Category;

export function Home() {
  const { thoughts, hasMore, loadMore, markRead, pendingOpen, clearOpen, u, c } = useApp();
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const open = thoughts.find((t) => t.id === openId) ?? null;

  // Boshqa sahifadan so‘ralgan fikrni ochish (Saqlanganlar, markaziy tugma).
  useEffect(() => {
    if (pendingOpen !== null) { setOpenId(pendingOpen); clearOpen(); }
  }, [pendingOpen, clearOpen]);

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

  if (open) {
    return (
      <article className="px-5 pb-14 pt-2">
        <button className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-muted" onClick={() => setOpenId(null)}>
          <ArrowLeft size={18} /> {u("Orqaga")}
        </button>
        <span className="mt-3 block text-[13px] font-semibold text-clay">{catLabel(open.category, u, c)}</span>
        <h1 className="font-display mt-2.5 text-[38px] leading-[1.06] text-balance">{c(open.title)}</h1>
        <div className="mt-7 space-y-5 font-serif text-[21px] font-medium leading-[1.7] text-pretty">
          {c(open.body).split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-7 border-t border-line pt-2"><ReactionBar t={open} /></div>
      </article>
    );
  }

  // Asosiy yo‘nalishlar + lentada uchragan boshqa mavzular.
  const cats = [...Object.keys(CATEGORY_LABEL), ...Array.from(new Set(thoughts.map((t) => t.category))).filter((k) => !(k in CATEGORY_LABEL))];
  const list = filter === "all" ? thoughts : thoughts.filter((t) => t.category === filter);
  const chip = (on: boolean) => `shrink-0 rounded-full px-4 min-h-[42px] text-[14px] font-semibold ${on ? "bg-clay text-onclay" : "glass text-ink"}`;

  return (
    <div className="px-5 pb-8 pt-2">
      <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5" role="group" aria-label={u("Yo‘nalish")}>
        <button className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{u("Hammasi")}</button>
        {cats.map((k) => (
          <button key={k} className={chip(filter === k)} aria-pressed={filter === k} onClick={() => setFilter(k)}>{catLabel(k, u, c)}</button>
        ))}
      </div>

      <div className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold">{u("Yangi fikrlar")}</h2>
        <span className="text-[13px] text-muted">{list.length}</span>
      </div>
      {list.length === 0 && <p className="mt-4 text-sm text-muted">{u("Hozircha fikr topilmadi.")}</p>}
      {list.map((t) => <ThoughtCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} />)}
      {hasMore && (
        <button className="glass mx-auto mt-5 flex min-h-[48px] items-center rounded-full px-6 text-[14px] font-semibold" onClick={loadMore}>{u("Yana ko‘rsatish")}</button>
      )}
    </div>
  );
}
