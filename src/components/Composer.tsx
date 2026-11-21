import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Category, Short } from "../lib/api";
import { toNew } from "../lib/alphabet";
import { useApp } from "../store";
import { CATEGORY_LABEL } from "./ThoughtCard";

const TONES: Array<[Short["tone"], string]> = [["sand", "Qum"], ["sage", "Moxor"], ["ink", "Siyoh"], ["clay", "Loy"]];

/** Admin uchun yozish oynasi. Matn eski alifboda yozilsa, yangisiga (kanonik) avtomatik o‘giriladi. */
export function Composer({ onClose }: { onClose: () => void }) {
  const { publish, u } = useApp();
  const [kind, setKind] = useState<"thought" | "short">("thought");
  const [category, setCategory] = useState<Category>("fikr");
  const [tone, setTone] = useState<Short["tone"]>("sand");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [already, setAlready] = useState(false);
  const [busy, setBusy] = useState(false);

  const conv = (s: string) => (already ? s : toNew(s));
  const valid = kind === "thought" ? title.trim().length >= 3 && body.trim().length >= 20 : body.trim().length >= 5;
  const changed = conv(title) !== title || conv(body) !== body;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const ok = await publish(
      kind === "thought"
        ? { kind, category, title: conv(title.trim()), body: conv(body.trim()) }
        : { kind, category, quote: conv(body.trim()), tone },
    );
    setBusy(false);
    if (ok) onClose();
  };

  const chip = (on: boolean) => `min-h-[40px] rounded-full px-4 text-[13px] font-semibold ${on ? "bg-clay text-onclay" : "bg-sand text-muted"}`;
  const field = "w-full rounded-2xl border border-line bg-sand p-3 text-base text-ink placeholder:text-muted";

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-center bg-paper" role="dialog" aria-modal="true" aria-label={u("Yangi fikr")}
      initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
      <div className="flex h-full w-full max-w-[560px] flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 pb-2 pt-[calc(8px+var(--safe-top))]">
          <h2 className="font-serif text-xl font-bold">{u("Yangi")}</h2>
          <button className="flex min-h-[44px] min-w-[44px] items-center justify-center" onClick={onClose} aria-label={u("Yopish")}><X size={22} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex gap-2" role="group" aria-label={u("Turi")}>
            <button className={chip(kind === "thought")} aria-pressed={kind === "thought"} onClick={() => setKind("thought")}>{u("Fikr")}</button>
            <button className={chip(kind === "short")} aria-pressed={kind === "short"} onClick={() => setKind("short")}>Short</button>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label={u("Yo‘nalish")}>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <button key={c} className={chip(category === c)} aria-pressed={category === c} onClick={() => setCategory(c)}>{u(CATEGORY_LABEL[c])}</button>
            ))}
          </div>

          {kind === "thought" && (
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} aria-label={u("Sarlavha")} placeholder={u("Sarlavha")} className={field} />
          )}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={kind === "thought" ? 8000 : 280}
            aria-label={kind === "thought" ? u("Matn") : u("Qisqa matn")}
            placeholder={kind === "thought" ? u("Matn (abzaslar orasiga bo‘sh qator qoldiring)") : u("Qisqa fikr (1–2 jumla)")}
            className={`${field} ${kind === "thought" ? "min-h-[220px]" : "min-h-[120px]"} resize-none`} />

          {kind === "short" && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={u("Fon rangi")}>
              {TONES.map(([t, label]) => <button key={t} className={chip(tone === t)} aria-pressed={tone === t} onClick={() => setTone(t)}>{u(label)}</button>)}
            </div>
          )}

          <label className="flex min-h-[44px] items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={already} onChange={(e) => setAlready(e.target.checked)} className="h-5 w-5" />
            {u("Matn allaqachon yangi alifboda (o‘girmasin)")}
          </label>

          {changed && (
            <div className="rounded-2xl bg-sand p-3 text-[14px]" aria-live="polite">
              <span className="text-[12px] text-muted">{u("Yangi alifboda joylanadi:")}</span>
              {kind === "thought" && <p className="mt-1 font-serif text-[17px] font-semibold">{conv(title)}</p>}
              <p className="mt-1 whitespace-pre-wrap font-serif text-[15px]">{conv(body)}</p>
            </div>
          )}
        </div>

        <div className="border-t border-line p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          <button className="min-h-[48px] w-full rounded-2xl bg-clay font-bold text-onclay disabled:opacity-50" disabled={!valid || busy} onClick={submit}>
            {u("Joylash")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
