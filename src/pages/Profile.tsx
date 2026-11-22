import { BookOpen, Check, Compass, Feather, Library, Lock } from "lucide-react";
import { useApp } from "../store";

const LEVELS = ["Kuzatuvchi", "Mulohazachi", "Mutafakkir"];
const DAYS = ["D", "S", "Ch", "P", "J", "Sh", "Y"];

/** Belgilar: faqat o‘qish odatiga bog‘liq (XP va bosim yo‘q). Nomlari eski alifboda yoziladi, u() o‘giradi. */
const BADGES = [
  { id: "first", title: "Birinchi sahifa", icon: BookOpen, goal: 1, value: (r: number) => r },
  { id: "five", title: "Besh fikr", icon: Feather, goal: 5, value: (r: number) => r },
  { id: "ten", title: "O‘n fikr", icon: Library, goal: 10, value: (r: number) => r },
  { id: "three", title: "Uch yo‘nalish", icon: Compass, goal: 3, value: (_: number, cats: number) => cats },
] as const;

export function Profile() {
  const { profile, stats, thoughts, alphabet, changeAlphabet, theme, setTheme, u, c } = useApp();
  const saved = thoughts.filter((t) => t.saved);
  const seg = (on: boolean) => `min-h-[44px] flex-1 rounded-xl px-3 text-[13px] font-semibold ${on ? "bg-clay text-onclay" : "text-muted"}`;
  const reads = stats?.reads ?? 0;
  const left = stats?.levelTo ? stats.levelTo - reads : 0;
  const name = profile?.first_name ?? u("Mehmon");

  return (
    <div className="p-4 pb-8">
      <section className="rounded-[22px] bg-sand p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-clay font-display text-[28px] font-bold text-onclay" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[26px] font-bold leading-tight">{name}</h1>
            {profile?.username && <p className="truncate text-sm text-muted">@{profile.username}</p>}
          </div>
        </div>
        {stats && (
          <>
            <span className="mt-4 inline-block rounded-full bg-paper px-3.5 py-1.5 text-[13px] font-semibold text-clay">
              {u("Unvon")}: {u(LEVELS[stats.level]!)}
            </span>
            {stats.levelTo ? (
              <>
                <div className="mt-3 h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={reads} aria-valuemin={0} aria-valuemax={stats.levelTo}>
                  <div className="h-1.5 rounded-full bg-clay" style={{ width: `${Math.min(100, (reads / stats.levelTo) * 100)}%` }} />
                </div>
                <p className="mt-2 text-[13px] text-muted">{u(LEVELS[stats.level + 1]!)} {u("unvoniga yana")} {left} {u("ta fikr qoldi")}</p>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-muted">{u("Eng yuqori unvonga yetdingiz.")}</p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
              {[[reads, "O‘qilgan fikrlar"], [saved.length, "Saqlanganlar"], [stats.streak, "Ketma-ket kun"]].map(([n, label]) => (
                <div key={label as string}>
                  <div className="font-display text-[28px] font-bold leading-none">{n}</div>
                  <div className="mt-1.5 text-[12px] leading-tight text-muted">{u(label as string)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {stats && (
        <>
          <section className="mt-4 rounded-[22px] bg-sand p-5" aria-label={u("Bugungi fikr")}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">{u("Bugungi fikr")}</h2>
              <span className="text-[13px] font-semibold text-muted">{stats.today ? 1 : 0}/1</span>
            </div>
            <p className="mt-1 text-sm text-muted">{stats.today ? u("Bugun o‘qidingiz. Ertaga davom eting.") : u("Bugun bitta fikr o‘qing.")}</p>
            <div className="mt-3 h-1.5 rounded-full bg-line" aria-hidden="true">
              <div className="h-1.5 rounded-full bg-clay" style={{ width: stats.today ? "100%" : "0%" }} />
            </div>
          </section>

          <section className="mt-4 rounded-[22px] bg-sand p-5" aria-label={u("Haftalik iz")}>
            <h2 className="font-display text-xl font-semibold">{u("Haftalik iz")}</h2>
            <div className="mt-4 flex justify-between">
              {DAYS.map((d, i) => {
                const on = stats.week[i];
                const now = i === stats.todayIndex;
                return (
                  <div key={d} className="flex flex-col items-center gap-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${on ? "bg-clay text-onclay" : "bg-paper text-muted"} ${now ? "ring-2 ring-clay ring-offset-2 ring-offset-sand" : ""}`}>
                      {on && <Check size={16} />}
                    </span>
                    <span className={`text-[12px] ${now ? "font-semibold text-ink" : "text-muted"}`}>{u(d)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-4 rounded-[22px] bg-sand p-5" aria-label={u("Belgilar")}>
            <h2 className="font-display text-xl font-semibold">{u("Belgilar")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {BADGES.map((b) => {
                const v = b.value(reads, stats.categories);
                const done = v >= b.goal;
                const Icon = b.icon;
                return (
                  <div key={b.id} className={`rounded-2xl border p-3.5 ${done ? "border-clay" : "border-line"}`}>
                    <span className={`relative flex h-11 w-11 items-center justify-center rounded-full ${done ? "bg-clay text-onclay" : "bg-paper text-muted"}`}>
                      <Icon size={20} />
                      {!done && <Lock size={12} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-sand p-[2px]" />}
                    </span>
                    <p className="mt-2.5 text-[14px] font-semibold leading-snug">{u(b.title)}</p>
                    <p className="mt-1 text-[12px] text-muted">{done ? u("Olindi") : `${u("yana")} ${b.goal - v}`}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {saved.length > 0 && (
        <>
          <h2 className="mt-6 font-display text-xl font-semibold">{u("Saqlanganlar")}</h2>
          <div className="mt-2 grid gap-2.5">
            {saved.map((t) => <p key={t.id} className="rounded-[18px] bg-sand p-4 font-serif text-[17px] leading-snug">{c(t.title)}</p>)}
          </div>
        </>
      )}

      <h2 className="mt-6 font-display text-xl font-semibold">{u("Ko‘rinish")}</h2>
      <div className="mt-2 flex gap-1 rounded-2xl border border-line p-1" role="group" aria-label={u("Ko‘rinish")}>
        {([["auto", "Avto"], ["light", "Kunduzgi"], ["dark", "Tungi"]] as const).map(([k, label]) => (
          <button key={k} className={seg(theme === k)} aria-pressed={theme === k} onClick={() => setTheme(k)}>{u(label)}</button>
        ))}
      </div>

      <h2 className="mt-6 font-display text-xl font-semibold">{u("Alifbo")}</h2>
      <div className="mt-2 flex gap-1 rounded-2xl border border-line p-1" role="group" aria-label={u("Alifbo")}>
        <button className={seg(alphabet === "new")} aria-pressed={alphabet === "new"} onClick={() => changeAlphabet("new")}>Yangi: Ö Ğ Ş Ç</button>
        <button className={seg(alphabet === "old")} aria-pressed={alphabet === "old"} onClick={() => changeAlphabet("old")}>Eski: O‘ G‘ Sh Ch</button>
      </div>
      <p className="mt-8 text-[12px] text-muted">v {__BUILD__} · {u("rol")}: {profile?.role === "admin" ? "admin" : u("oddiy")}</p>
    </div>
  );
}
