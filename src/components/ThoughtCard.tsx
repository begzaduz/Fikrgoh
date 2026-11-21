import { Bookmark, Heart } from "lucide-react";
import type { Thought } from "../lib/api";
import { useApp } from "../store";

export const CATEGORY_LABEL = { fikr: "Fikr", mindset: "Mindset", madaniyat: "Madaniyat" } as const;

export function ReactionBar({ t }: { t: Thought }) {
  const { react, u } = useApp();
  const base = "flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[13px]";
  return (
    <div className="mt-2 flex gap-1">
      <button className={`${base} ${t.liked ? "font-semibold text-clay" : "text-muted"}`} aria-pressed={t.liked} onClick={() => react(t, "like")}>
        <Heart size={18} fill={t.liked ? "currentColor" : "none"} /> {t.likes > 0 ? t.likes : u("Yoqdi")}
      </button>
      <button className={`${base} ${t.saved ? "font-semibold text-clay" : "text-muted"}`} aria-pressed={t.saved} onClick={() => react(t, "save")}>
        <Bookmark size={18} fill={t.saved ? "currentColor" : "none"} /> {u("Saqlash")}
      </button>
    </div>
  );
}

export function ThoughtCard({ t, onOpen }: { t: Thought; onOpen: () => void }) {
  const { c, u } = useApp();
  return (
    <article className="mt-3.5 rounded-[20px] bg-sand p-[18px]">
      <button className="block w-full text-left" onClick={onOpen}>
        <span className="text-[12px] font-semibold uppercase tracking-[1.5px] text-clay">{u(CATEGORY_LABEL[t.category])}</span>
        <h3 className="mt-1.5 font-serif text-[21px] font-semibold leading-snug">{c(t.title)}</h3>
        <span className="mt-2.5 block text-[13px] text-muted">
          {t.read_minutes} {u("daqiqa o‘qish")}
        </span>
      </button>
      <ReactionBar t={t} />
    </article>
  );
}
