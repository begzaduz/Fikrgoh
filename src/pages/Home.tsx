import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Reader } from "../components/Reader";
import { CATEGORY_LABEL, catLabel, ThoughtCard } from "../components/ThoughtCard";
import { getFeed, type Category, type Thought } from "../lib/api";
import { tg } from "../lib/tg";
import { useApp } from "../store";

type Filter = "all" | Category;

export function Home() {
  const { thoughts, hasMore, loadMore, markRead, injectThought, pendingOpen, clearOpen, u, c } = useApp();
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Thought[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const seq = useRef(0);
  const term = q.trim();
  const open = thoughts.find((t) => t.id === openId) ?? null;

  // Qidiruv shu sahifaning o‘zida: yozganingiz sari natijalar lentaning o‘rnida chiqadi.
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

  const pick = (t: Thought) => { injectThought(t); setOpenId(t.id); };
  const searching = term.length >= 2;

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

  if (open) return <Reader t={open} onClose={() => setOpenId(null)} />;

  // Asosiy yo‘nalishlar + lentada uchragan boshqa mavzular.
  const cats = [...Object.keys(CATEGORY_LABEL), ...Array.from(new Set(thoughts.map((t) => t.category))).filter((k) => !(k in CATEGORY_LABEL))];
  const list = filter === "all" ? thoughts : thoughts.filter((t) => t.category === filter);
  const chip = (on: boolean) => `shrink-0 rounded-full px-4 min-h-[42px] text-[14px] font-semibold ${on ? "bg-clay text-onclay" : "glass text-ink"}`;

  return (
    <div className="px-5 pb-8 pt-2">
      {!searching && (
        <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5" role="group" aria-label={u("Yo‘nalish")}>
          <button className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{u("Hammasi")}</button>
          {cats.map((k) => (
            <button key={k} className={chip(filter === k)} aria-pressed={filter === k} onClick={() => setFilter(k)}>{catLabel(k, u, c)}</button>
          ))}
        </div>
      )}

      <label className="glass mt-4 flex h-[52px] items-center gap-3 rounded-full pl-5 pr-2 focus-within:border-clay">
        <Search size={19} className="shrink-0 text-muted" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={u("Fikrlardan qidirish")} aria-label={u("Qidirish")}
          enterKeyHint="search" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus-visible:outline-none" />
        {q && (
          <button onClick={() => setQ("")} aria-label={u("Tozalash")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted"><X size={18} /></button>
        )}
      </label>

      {searching ? (
        <>
          {state === "loading" && [0, 1].map((i) => <div key={i} className="glass mt-3 h-[92px] animate-pulse rounded-[22px]" />)}
          {state === "error" && <p className="mt-8 text-center text-[15px] text-muted">{u("Qidirib bo‘lmadi. Internetni tekshiring.")}</p>}
          {state === "done" && rows.length === 0 && <p className="mt-8 text-center text-[15px] text-muted">{u("Hech narsa topilmadi.")}</p>}
          {state === "done" && rows.map((t) => (
            <button key={t.id} onClick={() => pick(t)} className="glass mt-3 block w-full rounded-[22px] p-4 text-left">
              <span className="text-[12px] font-semibold text-clay">{catLabel(t.category, u, c)}</span>
              <span className="mt-1.5 block text-[18px] font-semibold leading-[1.25]">{c(t.title)}</span>
              <span className="mt-1.5 line-clamp-2 block font-serif text-[16px] leading-snug text-muted">{c(t.body).split("\n\n")[0]}</span>
            </button>
          ))}
        </>
      ) : (
        <>
          <h2 className="mt-7 text-[18px] font-semibold">{u("Yangi fikrlar")}</h2>
          {list.length === 0 && <p className="mt-4 text-sm text-muted">{u("Hozircha fikr topilmadi.")}</p>}
          {list.map((t) => <ThoughtCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} />)}
          {hasMore && (
            <button className="glass mx-auto mt-5 flex min-h-[48px] items-center rounded-full px-6 text-[14px] font-semibold" onClick={loadMore}>{u("Yana ko‘rsatish")}</button>
          )}
        </>
      )}
    </div>
  );
}
