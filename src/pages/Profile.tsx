import { useApp } from "../store";

const LEVELS = ["Kuzatuvchi", "Mulohazachi", "Mutafakkir"];

export function Profile() {
  const { profile, daily, answers, thoughts, alphabet, changeAlphabet, u, c } = useApp();
  const saved = thoughts.filter((t) => t.saved);
  const pct = daily ? Math.min(100, Math.round(((daily.points - daily.levelFrom) / (daily.levelTo - daily.levelFrom)) * 100)) : 0;
  const seg = (on: boolean) => `min-h-[44px] flex-1 rounded-xl px-3 text-[13px] font-semibold ${on ? "bg-clay text-onclay" : "text-muted"}`;

  return (
    <div className="p-4 pb-8">
      <h1 className="font-serif text-[28px] font-bold">{profile?.first_name ?? u("Mehmon")}</h1>
      {profile?.username && <p className="text-sm text-muted">@{profile.username}</p>}

      {daily && (
        <section className="mt-4 rounded-[20px] bg-sage p-[18px] text-[#f3ecdd]" aria-label={u("Fikr darajasi")}>
          <span className="text-[13px]">{u("Fikr darajasi")}</span>
          <h2 className="mt-1 font-serif text-[28px] font-bold leading-tight">{u(LEVELS[daily.level]!)}</h2>
          <div className="mt-3.5 h-1.5 rounded-full bg-black/30" aria-hidden="true"><div className="h-1.5 rounded-full bg-[#f3ecdd]" style={{ width: `${pct}%` }} /></div>
          <span className="mt-2 block text-[13px]">{daily.points} / {daily.levelTo} · {daily.streak} {u("kun ketma-ket")}</span>
        </section>
      )}

      <h2 className="mt-6 font-serif text-xl font-semibold">{u("Mening javoblarim")}</h2>
      {answers.length === 0 && <p className="mt-2 text-sm text-muted">{u("Hali javob yozilmagan. Bosh sahifadan boshlang.")}</p>}
      <div className="mt-2 grid gap-2.5">
        {answers.slice(0, 5).map((a) => (
          <article key={`${a.day}-${a.idx}`} className="rounded-[18px] bg-sand p-4">
            <span className="text-[12px] text-muted">{a.day.slice(8, 10)}.{a.day.slice(5, 7)} · {c(a.question)}</span>
            <p className="mt-2 font-serif text-[17px] leading-snug">{a.body}</p>
          </article>
        ))}
      </div>

      {saved.length > 0 && (
        <>
          <h2 className="mt-6 font-serif text-xl font-semibold">{u("Saqlanganlar")}</h2>
          <div className="mt-2 grid gap-2.5">
            {saved.map((t) => <p key={t.id} className="rounded-[18px] bg-sand p-4 font-serif text-[17px] leading-snug">{c(t.title)}</p>)}
          </div>
        </>
      )}

      <h2 className="mt-6 font-serif text-xl font-semibold">{u("Alifbo")}</h2>
      <div className="mt-2 flex gap-1 rounded-2xl border border-line p-1" role="group" aria-label={u("Alifbo")}>
        <button className={seg(alphabet === "new")} aria-pressed={alphabet === "new"} onClick={() => changeAlphabet("new")}>Yangi: Ö Ğ Ş Ç</button>
        <button className={seg(alphabet === "old")} aria-pressed={alphabet === "old"} onClick={() => changeAlphabet("old")}>Eski: O‘ G‘ Sh Ch</button>
      </div>
    </div>
  );
}
