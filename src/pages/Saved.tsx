import { ChevronRight } from "lucide-react";
import { catLabel } from "../components/ThoughtCard";
import { useApp } from "../store";

/** Saqlangan fikrlar: bosilsa Bosh sahifada o‘sha fikr ochiladi. */
export function Saved({ onOpen }: { onOpen: () => void }) {
  const { thoughts, requestOpen, u, c } = useApp();
  const saved = thoughts.filter((t) => t.saved);
  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="font-display text-[44px] leading-[1.02]">{u("Saqlanganlar")}</h1>
      <p className="mt-2 text-[14px] text-muted">{saved.length} {u("ta fikr")}</p>
      {saved.length === 0 && <p className="glass mt-6 rounded-[22px] p-5 text-[14px] text-muted">{u("Hali saqlangan fikr yo‘q. Fikr ostidagi “Saqlash” tugmasini bosing.")}</p>}
      <div className="mt-5 grid gap-2.5">
        {saved.map((t) => (
          <button key={t.id} onClick={() => { requestOpen(t.id); onOpen(); }} className="glass flex items-center gap-3 rounded-[22px] p-4 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-clay">{catLabel(t.category, u, c)}</span>
              <span className="mt-1 block text-[18px] font-semibold leading-snug">{c(t.title)}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}
