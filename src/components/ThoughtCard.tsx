import type { Thought } from "../lib/api";
import { useApp } from "../store";
import { AdminMenu } from "./AdminMenu";

export const CATEGORY_LABEL = { fikr: "Fikr", mindset: "Mindset", madaniyat: "Madaniyat" } as const;
const mono = "font-mono text-[11px] uppercase tracking-[0.14em]";

export function ReactionBar({ t }: { t: Thought }) {
  const { react, u } = useApp();
  const base = `flex min-h-[40px] items-center border px-3.5 ${mono}`;
  const on = "border-clay bg-clay text-onclay";
  const off = "border-line text-muted";
  return (
    <div className="mt-3 flex gap-2">
      <button className={`${base} ${t.liked ? on : off}`} aria-pressed={t.liked} onClick={() => react(t, "like")}>
        {t.likes > 0 ? `♥ ${t.likes}` : u("Yoqdi")}
      </button>
      <button className={`${base} ${t.saved ? on : off}`} aria-pressed={t.saved} onClick={() => react(t, "save")}>
        {u("Saqlash")}
      </button>
    </div>
  );
}

export function ThoughtCard({ t, onOpen, index }: { t: Thought; onOpen: () => void; index: number }) {
  const { c, u, canWrite, setComposer, remove } = useApp();
  return (
    <article className="relative border-t border-ink pb-5 pt-4">
      {canWrite && (
        <div className="absolute right-[-10px] top-1">
          <AdminMenu onEdit={() => setComposer({ mode: "edit", kind: "thought", id: t.id, category: t.category, title: t.title, body: t.body })} onDelete={() => remove("thought", t.id)} />
        </div>
      )}
      <button className="block w-full text-left" onClick={onOpen}>
        <span className={`flex items-center gap-3 ${mono}`}>
          <span className="text-clay">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-muted">{u(CATEGORY_LABEL[t.category])}</span>
        </span>
        <h3 className="font-display mt-3 text-[34px] leading-[0.98] text-balance">{c(t.title)}</h3>
        <p className="mt-3 line-clamp-2 font-serif text-[15px] leading-relaxed text-muted">{c(t.body).split("\n\n")[0]}</p>
        <span className={`mt-3 block text-muted ${mono}`}>{t.read_minutes} {u("daqiqa o‘qish")}</span>
      </button>
      <ReactionBar t={t} />
    </article>
  );
}
