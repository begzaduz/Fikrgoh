import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { Bars, Spark } from "../components/Charts";
import { CATEGORY_LABEL, ReactionBar, ThoughtCard } from "../components/ThoughtCard";
import type { Category } from "../lib/api";
import { greeting, weekDates } from "../lib/today";
import { tg } from "../lib/tg";
import { useApp } from "../store";

const LEVELS = ["Kuzatuvchi", "Mulohazachi", "Mutafakkir"];
type Filter = "all" | Category;

export function Home({ goProfile }: { goProfile: () => void }) {
  const { thoughts, search, markRead, stats, history, profile, pendingOpen, clearOpen, u, c } = useApp();
  const [openId, setOpenId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const first = useRef(true);
  const open = thoughts.find((t) => t.id === openId) ?? null;

  // Qidiruv: 350 ms kutib yuboriladi. Eski va yangi alifbo bir xil natija beradi.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = window.setTimeout(() => search(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q, search]);

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
        <span className="mt-3 block text-[13px] font-semibold text-clay">{u(CATEGORY_LABEL[open.category])}</span>
        <h1 className="font-display mt-2.5 text-[38px] leading-[1.06] text-balance">{c(open.title)}</h1>
        <div className="mt-7 space-y-5 font-serif text-[18px] leading-[1.8] text-pretty">
          {c(open.body).split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-7 border-t border-line pt-2"><ReactionBar t={open} /></div>
      </article>
    );
  }

  const streak = stats?.streak ?? 0;
  const headline = stats?.today ? u("Bugun fikr o‘qidingiz. Davom eting!") : streak > 1 ? `${streak} ${u("kundan beri fikrlayapsiz!")}` : u("Bugun qaysi fikrdan boshlaymiz?");
  const dates = stats ? weekDates(stats.todayIndex) : [];
  const counts = stats ? stats.week.map((on, i) => history.filter((h) => h.day === dates[i]).length || (on ? 1 : 0)) : [];
  const cum = counts.reduce<number[]>((a, n) => [...a, (a[a.length - 1] ?? 0) + n], []);
  const list = filter === "all" ? thoughts : thoughts.filter((t) => t.category === filter);
  const chip = (on: boolean) => `shrink-0 rounded-full px-4 min-h-[42px] text-[14px] font-semibold ${on ? "bg-clay text-onclay" : "glass text-ink"}`;
  const card = "glass w-[46%] shrink-0 snap-start rounded-[26px] p-4 text-left";

  return (
    <div className="px-5 pb-8">
      <section className="relative pt-5 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 blur-xl" style={{ background: "radial-gradient(circle, var(--clay) 0%, transparent 70%)", opacity: 0.35 }} />
        <p className="relative text-[15px] text-muted">{u(greeting())}{profile ? `, ${profile.first_name}` : ""}!</p>
        <h1 className="font-display relative mx-auto mt-3 max-w-[16ch] text-[34px] leading-[1.1] text-balance">{headline}</h1>
      </section>

      <label className="glass mt-6 flex min-h-[54px] items-center gap-3 rounded-full pl-5 pr-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={u("Fikrlardan qidirish")} aria-label={u("Qidirish")}
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted" />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted" aria-hidden="true"><Search size={18} /></span>
      </label>

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5" role="group" aria-label={u("Yo‘nalish")}>
        <button className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{u("Hammasi")}</button>
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
          <button key={k} className={chip(filter === k)} aria-pressed={filter === k} onClick={() => setFilter(k)}>{u(CATEGORY_LABEL[k])}</button>
        ))}
      </div>

      {stats && (
        <section className="mt-7" aria-label={u("Sizning faolligingiz")}>
          <button className="flex w-full items-center justify-between text-left" onClick={goProfile}>
            <h2 className="text-[18px] font-semibold">{u("Sizning faolligingiz")}</h2>
            <ChevronRight size={20} className="text-muted" />
          </button>
          <div className="no-scrollbar -mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5">
            <button className={card} onClick={goProfile}>
              <span className="block text-[15px] font-semibold">{u("O‘qilgan fikrlar")}</span>
              <span className="block text-[12px] text-muted">{u("Bu hafta")}</span>
              <Bars values={counts} className="mt-3 h-12 w-full text-clay" />
              <span className="mt-3 flex items-baseline gap-1.5"><span className="text-[40px] font-semibold leading-none">{stats.reads}</span><span className="text-[13px] text-muted">{u("ta")}</span></span>
            </button>
            <button className={card} onClick={goProfile}>
              <span className="block text-[15px] font-semibold">{u("Ketma-ket")}</span>
              <span className="block text-[12px] text-muted">{u("Kunlar")}</span>
              <Spark values={cum} className="mt-3 h-12 w-full text-spark" />
              <span className="mt-3 flex items-baseline gap-1.5"><span className="text-[40px] font-semibold leading-none">{stats.streak}</span><span className="text-[13px] text-muted">{u("kun")}</span></span>
            </button>
            <button className={card} onClick={goProfile}>
              <span className="block text-[15px] font-semibold">{u("Unvon")}</span>
              <span className="block text-[12px] text-muted">{u("Hozirgi")}</span>
              <span className="mt-6 block text-[24px] font-semibold leading-tight">{u(LEVELS[stats.level]!)}</span>
              <span className="mt-4 block h-1.5 rounded-full bg-sand"><span className="block h-1.5 rounded-full bg-clay" style={{ width: stats.levelTo ? `${Math.min(100, (stats.reads / stats.levelTo) * 100)}%` : "100%" }} /></span>
            </button>
          </div>
        </section>
      )}

      <div className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold">{u("Yangi fikrlar")}</h2>
        <span className="text-[13px] text-muted">{list.length}</span>
      </div>
      {list.length === 0 && <p className="mt-4 text-sm text-muted">{u("Hozircha fikr topilmadi.")}</p>}
      {list.map((t) => <ThoughtCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} />)}
    </div>
  );
}
