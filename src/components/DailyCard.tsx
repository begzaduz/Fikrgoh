import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../store";

/** "Bugungi 5 savol" kartasi va javob yozish oynasi. Javoblar faqat foydalanuvchining o‘ziga ko‘rinadi. */
export function DailyCard() {
  const { daily, answer, u, c, notice } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const next = daily?.questions.find((q) => q.answer === null) ?? null;

  const submit = async () => {
    if (!next || !text.trim() || busy) return;
    setBusy(true);
    const ok = await answer(next.index, text.trim());
    setBusy(false);
    if (ok) {
      setText("");
      if ((daily?.done ?? 0) + 1 >= 5) setOpen(false);
    }
  };

  return (
    <section className="rounded-[22px] bg-night p-5 text-onnight" aria-label={u("Kunlik savollar")}>
      <span className="text-[12px] tracking-[2px] text-[#b9ad9a]">{u("KUNLIK FIKRLAR").toUpperCase()}</span>
      <h2 className="mt-1.5 font-serif text-2xl font-bold leading-tight">{u("Bugungi 5 savol")}</h2>
      <div className="mt-3.5 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={`h-1.5 flex-1 rounded-full ${daily && i < daily.done ? "bg-peach" : "bg-[#4a4036]"}`} />
        ))}
      </div>
      {daily && daily.streak > 0 && (
        <p className="mt-3 text-[13px] text-[#d9cdb5]">
          {daily.streak} {u("kun ketma-ket fikrlading")}
        </p>
      )}
      {!daily ? null : next ? (
        <button className="mt-4 min-h-[46px] w-full rounded-2xl bg-peach font-bold text-[#211c17]" onClick={() => setOpen(true)}>
          {daily.done ? u("Davom etish") : u("Boshlash")} · {daily.done}/5
        </button>
      ) : (
        <p className="mt-3.5 text-sm text-[#d9cdb5]">{u("Bugungi savollar tugadi. Ertaga yangilari bor.")}</p>
      )}

      <AnimatePresence>
        {open && next && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" role="dialog" aria-modal="true" aria-label={u("Kunlik savol")}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-[560px] rounded-t-3xl bg-paper px-5 pb-[calc(22px+env(safe-area-inset-bottom,0px))] pt-[22px] text-ink"
              initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}>
              <span className="text-[13px] text-muted">{u("Savol")} {next.index + 1} / 5</span>
              <h3 className="mt-1.5 font-serif text-2xl font-bold leading-snug">{c(next.text)}</h3>
              <textarea autoFocus aria-label={u("Javobingiz")} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={u("Fikringizni yozing...")}
                className="mb-1.5 mt-3.5 min-h-[120px] w-full resize-none rounded-2xl border border-line bg-sand p-3 text-base text-ink" />
              <p className="mb-3.5 text-[13px] text-muted">{u("Javobingiz faqat sizga ko‘rinadi.")}</p>
              <div className="flex gap-2.5">
                <button className="min-h-[46px] flex-1 rounded-2xl bg-clay font-bold text-onclay disabled:opacity-50" disabled={busy || !text.trim()} onClick={submit}>
                  {u("Saqlash")}
                </button>
                <button className="min-h-[46px] px-4 text-muted" onClick={() => setOpen(false)}>{u("Keyinroq")}</button>
              </div>
              {notice && <p role="status" className="mt-2 text-[13px] text-clay">{notice}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
