import { CATEGORY_LABEL } from "../components/ThoughtCard";
import { useApp } from "../store";

const TONE = {
  sand: "bg-[#e8dec9] text-[#211c17]",
  sage: "bg-[#5f6f55] text-[#f3ecdd]",
  ink: "bg-[#211c17] text-[#f3ecdd]",
  clay: "bg-[#a2461f] text-[#f3ecdd]",
} as const;

/** Qisqa fikrlar: vertikal aylantiriladigan to‘liq ekranli kartalar. (Video qo‘llab-quvvatlash keyingi bosqichda.) */
export function Shorts() {
  const { shorts, u, c } = useApp();
  if (!shorts.length) return <p className="p-6 text-sm text-muted">{u("Hozircha qisqa fikrlar yo‘q.")}</p>;
  return (
    <div className="h-full snap-y snap-mandatory overflow-y-auto">
      {shorts.map((s) => (
        <section key={s.id} className={`flex h-full snap-start flex-col justify-end gap-3 p-7 ${TONE[s.tone]}`}>
          <span className="text-[12px] font-semibold uppercase tracking-[2px] opacity-80">{u(CATEGORY_LABEL[s.category])}</span>
          <p className="font-serif text-[28px] font-semibold leading-snug">{c(s.quote)}</p>
        </section>
      ))}
    </div>
  );
}
