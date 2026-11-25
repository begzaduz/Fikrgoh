import { Bookmark, Heart } from "lucide-react";
import type { Thought } from "../lib/api";
import { useApp } from "../store";
import { AdminMenu } from "./AdminMenu";

export const CATEGORY_LABEL: Record<string, string> = { fikr: "Fikr", mindset: "Mindset", madaniyat: "Madaniyat" };
/** Asosiy yo‘nalish: interfeys matni (u). Boshqa mavzu: bazadagi kanonik matn (c), bosh harf bilan. */
export const catLabel = (k: string, u: (s: string) => string, c: (s: string) => string) =>
  k in CATEGORY_LABEL ? u(CATEGORY_LABEL[k]!) : c(k.charAt(0).toUpperCase() + k.slice(1));

export function ReactionBar({ t }: { t: Thought }) {
  const { react, u } = useApp();
  const base = "flex min-h-[42px] items-center gap-2 rounded-full border px-4 text-[13px] font-semibold";
  const on = "border-transparent bg-clay text-onclay";
  const off = "border-line text-muted";
  return (
    <div className="mt-3 flex gap-2">
      <button className={`${base} ${t.liked ? on : off}`} aria-pressed={t.liked} onClick={() => react(t, "like")}>
        <Heart size={16} fill={t.liked ? "currentColor" : "none"} /> {t.likes > 0 ? t.likes : u("Yoqdi")}
      </button>
      <button className={`${base} ${t.saved ? on : off}`} aria-pressed={t.saved} onClick={() => react(t, "save")}>
        <Bookmark size={16} fill={t.saved ? "currentColor" : "none"} /> {u("Saqlash")}
      </button>
    </div>
  );
}

export function ThoughtCard({ t, onOpen }: { t: Thought; onOpen: () => void }) {
  const { c, u, canWrite, setComposer, remove } = useApp();
  return (
    <article className="glass relative mt-3 rounded-[26px] p-5">
      {canWrite && (
        <div className="absolute right-2 top-2">
          <AdminMenu onEdit={() => setComposer({ mode: "edit", kind: "thought", id: t.id, category: t.category, title: t.title, body: t.body })} onDelete={() => remove("thought", t.id)} />
        </div>
      )}
      <button className="block w-full text-left" onClick={onOpen}>
        <span className="flex items-center gap-2.5 text-[12px] font-semibold text-clay">
          <span>{catLabel(t.category, u, c)}</span>
          <span className="font-normal text-muted">· {t.read_minutes} {u("daqiqa o‘qish")}</span>
        </span>
        <h3 className="mt-2.5 pr-8 text-[22px] font-semibold leading-[1.2] text-balance">{c(t.title)}</h3>
        <p className="mt-2.5 line-clamp-2 font-serif text-[17px] font-medium leading-snug text-muted">{c(t.body).split("\n\n")[0]}</p>
      </button>
    </article>
  );
}
