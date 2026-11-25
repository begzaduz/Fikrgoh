import { useState } from "react";
import { CalendarDays, Check, ChevronRight } from "lucide-react";
import { Bars, Wave } from "../components/Charts";
import { weekDates } from "../lib/today";
import { useApp } from "../store";

const LEVELS = ["Kuzatuvchi", "Mulohazachi", "Mutafakkir"];
const DAYS = ["D", "S", "Ch", "P", "J", "Sh", "Y"];

/** Belgilar: faqat o‘qish odatiga bog‘liq (XP va bosim yo‘q). Nomlari eski alifboda yoziladi, u() o‘giradi. */
const BADGES = [
  { id: "first", title: "Birinchi sahifa", goal: 1, value: (r: number) => r },
  { id: "five", title: "Besh fikr", goal: 5, value: (r: number) => r },
  { id: "ten", title: "O‘n fikr", goal: 10, value: (r: number) => r },
  { id: "three", title: "Uch yo‘nalish", goal: 3, value: (_: number, cats: number) => cats },
] as const;

const dm = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

/** Telegram profil rasmi; ochilmasa ismning bosh harfi. */
function Avatar({ url, name }: { url: string | null; name: string }) {
  const [bad, setBad] = useState(false);
  const box = "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-clay text-[22px] font-bold text-onclay";
  if (url && !bad) return <span className={box}><img src={url} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-full w-full object-cover" /></span>;
  return <span className={box} aria-hidden="true">{name.charAt(0).toUpperCase() || "·"}</span>;
}

export function Profile() {
  const { profile, stats, statsError, reloadStats, thoughts, history, alphabet, changeAlphabet, theme, setTheme, u, c } = useApp();
  const [sel, setSel] = useState<number | null>(null);   // tanlangan hafta kuni (null — hammasi)
  const saved = thoughts.filter((t) => t.saved).length;
  const reads = stats?.reads ?? 0;
  const left = stats?.levelTo ? stats.levelTo - reads : 0;
  const activeDays = stats ? stats.week.filter(Boolean).length : 0;
  const dates = stats ? weekDates(stats.todayIndex) : [];
  const counts = stats ? stats.week.map((on, i) => history.filter((h) => h.day === dates[i]).length || (on ? 1 : 0)) : [];
  const rows = sel === null ? history.slice(0, 8) : history.filter((h) => h.day === dates[sel]);
  const seg = (on: boolean) => `min-h-[44px] flex-1 rounded-full px-2 text-[13px] font-semibold ${on ? "bg-clay text-onclay" : "text-muted"}`;
  const group = "glass mt-3 flex gap-1 rounded-full p-1";
  const h2 = "text-[18px] font-semibold";

  return (
    <div className="px-5 pb-10 pt-4">
      <h1 className="font-display text-[46px] leading-[1.02]">{u("Mening")}<br />{u("yo‘lim")}</h1>
      <div className="mt-3 flex items-center gap-3">
        <Avatar url={profile?.photo_url ?? null} name={profile?.first_name ?? ""} />
        <p className="text-[14px] text-muted"><span className="block text-[17px] font-semibold text-ink">{profile?.first_name ?? u("Mehmon")}</span>{profile?.username ? `@${profile.username}` : ""}</p>
      </div>

      {!stats && statsError && (
        <section className="glass mt-6 rounded-[24px] p-4" role="alert">
          <p className="text-[15px] font-semibold">{u("Statistika yuklanmadi")}</p>
          <p className="mt-1 break-words text-[12px] text-muted">{statsError}</p>
          <button className="mt-3 min-h-[44px] rounded-full bg-clay px-5 text-[13px] font-semibold text-onclay" onClick={reloadStats}>{u("Qayta urinish")}</button>
        </section>
      )}

      {stats && (
        <>
          <section className="mt-6" aria-label={u("Haftalik iz")}>
            <div className="flex items-center justify-between">
              <h2 className={h2}>{u("Haftalik iz")}</h2>
              <CalendarDays size={22} className="text-muted" aria-hidden="true" />
            </div>
            <div className="mt-3 flex gap-1.5" role="group" aria-label={u("Haftalik iz")}>
              {DAYS.map((d, i) => {
                const on = sel === i;
                const now = i === stats.todayIndex;
                return (
                  <button key={d} onClick={() => setSel(on ? null : i)} aria-pressed={on}
                    className={`flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold ${on ? "bg-clay text-onclay" : "glass text-ink"} ${now && !on ? "ring-1 ring-clay" : ""}`}>
                    <span>{u(d)}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${stats.week[i] ? (on ? "bg-onclay" : "bg-clay") : "bg-transparent"}`} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="featured relative row-span-2 min-h-[240px] overflow-hidden rounded-[28px] p-4">
              <p className="text-[15px] font-semibold">{u("Keyingi unvon")}</p>
              <p className="mt-0.5 text-[12px] opacity-75">{stats.levelTo ? u(LEVELS[stats.level + 1]!) : u("Eng yuqori unvon")}</p>
              <Wave className="absolute inset-x-0 bottom-10 h-24 w-full" />
              <div className="absolute inset-x-4 bottom-4">
                <p className="flex items-baseline gap-1.5"><span className="text-[52px] font-semibold leading-none">{stats.levelTo ? left : reads}</span><span className="text-[13px] opacity-80">{u("ta fikr")}</span></p>
                <p className="mt-1.5 text-[12px] leading-snug opacity-85">
                  {stats.levelTo ? <>{u(LEVELS[stats.level + 1]!)} {u("unvoniga yana")} {left} {u("ta fikr qoldi")}</> : u("Eng yuqori unvonga yetdingiz.")}
                </p>
              </div>
            </div>
            <div className="glass relative rounded-[28px] p-4">
              <p className="text-[15px] font-semibold">{u("Haftalik faollik")}</p>
              <span className="absolute right-3 top-3 rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-muted">{activeDays}/7</span>
              <Bars values={counts} className="mt-5 h-12 w-full text-clay" />
            </div>
            <div className="glass rounded-[28px] p-4">
              <p className="text-[15px] font-semibold">{u("Unvon")}</p>
              <span className="mt-4 inline-block rounded-full bg-sand px-4 py-2 text-[14px] font-semibold text-clay">{u(LEVELS[stats.level]!)}</span>
            </div>
          </div>

          <div className="glass mt-3 grid grid-cols-3 divide-x divide-[var(--line)] rounded-[26px] py-4">
            {[[reads, "O‘qilgan fikrlar"], [saved, "Saqlanganlar"], [stats.streak, "Ketma-ket kun"]].map(([n, label]) => (
              <div key={label as string} className="px-4">
                <div className="text-[34px] font-semibold leading-none">{n}</div>
                <div className="mt-2 text-[11px] leading-tight text-muted">{u(label as string)}</div>
              </div>
            ))}
          </div>

          <section className="mt-7" aria-label={u("Tarix")}>
            <div className="flex items-baseline justify-between">
              <h2 className={h2}>{u("Tarix")}</h2>
              <button className="text-[13px] text-muted" onClick={() => setSel(null)}>{u("Hammasi")}</button>
            </div>
            <div className="mt-3 grid gap-2.5">
              {rows.length === 0 && <p className="glass rounded-[20px] p-4 text-[14px] text-muted">{u("Bu kunda fikr o‘qilmagan.")}</p>}
              {rows.map((h) => (
                <div key={`${h.day}-${h.thought_id}`} className="glass flex items-center gap-3 rounded-[20px] px-4 py-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay text-onclay"><Check size={15} strokeWidth={3} /></span>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{c(h.title)}</span>
                  <span className="shrink-0 text-[12px] text-muted">{dm(h.day)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-7" aria-label={u("Belgilar")}>
            <h2 className={h2}>{u("Belgilar")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {BADGES.map((b) => {
                const v = b.value(reads, stats.categories);
                const done = v >= b.goal;
                return (
                  <div key={b.id} className={`glass rounded-[24px] p-4 ${done ? "ring-1 ring-clay" : ""}`}>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? "bg-clay text-onclay" : "bg-sand text-muted"}`}><Check size={18} strokeWidth={done ? 3 : 1.5} /></span>
                    <p className="mt-3 text-[15px] font-semibold leading-snug">{u(b.title)}</p>
                    <p className="mt-1 text-[12px] text-muted">{done ? u("Olindi") : `${u("yana")} ${b.goal - v}`}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="mt-7">
        <h2 className={h2}>{u("Ko‘rinish")}</h2>
        <div className={group} role="group" aria-label={u("Ko‘rinish")}>
          {([["auto", "Avto"], ["light", "Kunduzgi"], ["dark", "Tungi"]] as const).map(([k, label]) => (
            <button key={k} className={seg(theme === k)} aria-pressed={theme === k} onClick={() => setTheme(k)}>{u(label)}</button>
          ))}
        </div>
        <h2 className={`${h2} mt-6`}>{u("Alifbo")}</h2>
        <div className={group} role="group" aria-label={u("Alifbo")}>
          <button className={seg(alphabet === "new")} aria-pressed={alphabet === "new"} onClick={() => changeAlphabet("new")}>Yangi: Ö Ğ Ş Ç</button>
          <button className={seg(alphabet === "old")} aria-pressed={alphabet === "old"} onClick={() => changeAlphabet("old")}>Eski: O‘ G‘ Sh Ch</button>
        </div>
      </section>

      <p className="mt-9 flex items-center gap-1 text-[12px] text-muted">v {__BUILD__} · {u("rol")}: {profile?.role === "admin" ? "admin" : u("oddiy")} <ChevronRight size={12} className="opacity-0" aria-hidden="true" /></p>
    </div>
  );
}
