import { useApp } from "../store";

const LEVELS = ["Kuzatuvchi", "Mulohazachi", "Mutafakkir"];
const DAYS = ["D", "S", "Ch", "P", "J", "Sh", "Y"];
const mono = "font-mono text-[11px] uppercase tracking-[0.14em]";

/** Belgilar: faqat o‘qish odatiga bog‘liq (XP va bosim yo‘q). Nomlari eski alifboda yoziladi, u() o‘giradi. */
const BADGES = [
  { id: "first", title: "Birinchi sahifa", goal: 1, value: (r: number) => r },
  { id: "five", title: "Besh fikr", goal: 5, value: (r: number) => r },
  { id: "ten", title: "O‘n fikr", goal: 10, value: (r: number) => r },
  { id: "three", title: "Uch yo‘nalish", goal: 3, value: (_: number, cats: number) => cats },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9" aria-label={title}>
      <h2 className={`border-b border-ink pb-2 text-muted ${mono}`}>{title}</h2>
      {children}
    </section>
  );
}

export function Profile() {
  const { profile, stats, thoughts, alphabet, changeAlphabet, theme, setTheme, u, c } = useApp();
  const saved = thoughts.filter((t) => t.saved);
  const reads = stats?.reads ?? 0;
  const left = stats?.levelTo ? stats.levelTo - reads : 0;
  const name = profile?.first_name ?? u("Mehmon");
  const seg = (on: boolean) => `min-h-[46px] flex-1 px-2 ${mono} ${on ? "bg-ink text-paper" : "text-muted"}`;
  const group = "mt-4 flex divide-x divide-ink border border-ink";

  return (
    <div className="px-5 pb-12 pt-6">
      <p className={`text-muted ${mono}`}>{u("Profil")}</p>
      <h1 className="font-display mt-2 break-words text-[64px] leading-[0.88]">{name}</h1>
      {profile?.username && <p className="mt-3 font-mono text-[12px] text-muted">@{profile.username}</p>}

      {stats && (
        <>
          <div className="mt-6 border-y border-ink py-3">
            <span className={`text-clay ${mono}`}>{u("Unvon")}: {u(LEVELS[stats.level]!)}</span>
            {stats.levelTo ? (
              <>
                <div className="mt-3 h-[3px] bg-line" role="progressbar" aria-valuenow={reads} aria-valuemin={0} aria-valuemax={stats.levelTo}>
                  <div className="h-[3px] bg-clay" style={{ width: `${Math.min(100, (reads / stats.levelTo) * 100)}%` }} />
                </div>
                <p className="mt-2.5 text-[13px] text-muted">{u(LEVELS[stats.level + 1]!)} {u("unvoniga yana")} {left} {u("ta fikr qoldi")}</p>
              </>
            ) : (
              <p className="mt-2.5 text-[13px] text-muted">{u("Eng yuqori unvonga yetdingiz.")}</p>
            )}
          </div>

          <div className="grid grid-cols-3 divide-x divide-line border-b border-ink">
            {[[reads, "O‘qilgan fikrlar"], [saved.length, "Saqlanganlar"], [stats.streak, "Ketma-ket kun"]].map(([n, label], i) => (
              <div key={label as string} className={`py-5 ${i > 0 ? "pl-4" : ""}`}>
                <div className="font-display text-[56px] leading-none">{n}</div>
                <div className={`mt-2.5 text-[10px] leading-tight text-muted ${mono.replace("text-[11px]", "")}`}>{u(label as string)}</div>
              </div>
            ))}
          </div>

          <Section title={u("Bugungi fikr")}>
            <div className="flex items-baseline justify-between pt-4">
              <p className="text-[15px]">{stats.today ? u("Bugun o‘qidingiz. Ertaga davom eting.") : u("Bugun bitta fikr o‘qing.")}</p>
              <span className="font-mono text-[13px] text-muted">{stats.today ? 1 : 0}/1</span>
            </div>
          </Section>

          <Section title={u("Haftalik iz")}>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {DAYS.map((d, i) => {
                const on = stats.week[i];
                const now = i === stats.todayIndex;
                return (
                  <div key={d} className="flex flex-col items-center gap-2">
                    <span className={`h-11 w-full ${on ? "bg-clay" : "border border-line"} ${now ? "outline outline-2 outline-offset-2 outline-ink" : ""}`} aria-hidden="true" />
                    <span className={`font-mono text-[11px] ${now ? "text-ink" : "text-muted"}`}>{u(d)}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={u("Belgilar")}>
            <ul>
              {BADGES.map((b, i) => {
                const v = b.value(reads, stats.categories);
                const done = v >= b.goal;
                return (
                  <li key={b.id} className="flex items-center justify-between border-b border-line py-4">
                    <div>
                      <p className={`text-[17px] font-semibold leading-tight ${done ? "" : "text-muted"}`}>{u(b.title)}</p>
                      <p className={`mt-1 text-muted ${mono}`}>{done ? u("Olindi") : `${u("yana")} ${b.goal - v}`}</p>
                    </div>
                    <span className={`font-display text-[40px] leading-none ${done ? "text-clay" : "text-line"}`} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        </>
      )}

      {saved.length > 0 && (
        <Section title={u("Saqlanganlar")}>
          <ul>
            {saved.map((t) => <li key={t.id} className="border-b border-line py-4 font-display text-[26px] leading-[1]">{c(t.title)}</li>)}
          </ul>
        </Section>
      )}

      <Section title={u("Ko‘rinish")}>
        <div className={group} role="group" aria-label={u("Ko‘rinish")}>
          {([["auto", "Avto"], ["light", "Kunduzgi"], ["dark", "Tungi"]] as const).map(([k, label]) => (
            <button key={k} className={seg(theme === k)} aria-pressed={theme === k} onClick={() => setTheme(k)}>{u(label)}</button>
          ))}
        </div>
      </Section>

      <Section title={u("Alifbo")}>
        <div className={group} role="group" aria-label={u("Alifbo")}>
          <button className={seg(alphabet === "new")} aria-pressed={alphabet === "new"} onClick={() => changeAlphabet("new")}>Yangi: Ö Ğ Ş Ç</button>
          <button className={seg(alphabet === "old")} aria-pressed={alphabet === "old"} onClick={() => changeAlphabet("old")}>Eski: O‘ G‘ Sh Ch</button>
        </div>
      </Section>

      <p className={`mt-10 text-muted ${mono}`}>v {__BUILD__} · {u("rol")}: {profile?.role === "admin" ? "admin" : u("oddiy")}</p>
    </div>
  );
}
