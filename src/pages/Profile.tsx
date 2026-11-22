import { useApp } from "../store";

export function Profile() {
  const { profile, thoughts, alphabet, changeAlphabet, u, c } = useApp();
  const saved = thoughts.filter((t) => t.saved);
  const seg = (on: boolean) => `min-h-[44px] flex-1 rounded-xl px-3 text-[13px] font-semibold ${on ? "bg-clay text-onclay" : "text-muted"}`;

  return (
    <div className="p-4 pb-8">
      <h1 className="font-serif text-[28px] font-bold">{profile?.first_name ?? u("Mehmon")}</h1>
      {profile?.username && <p className="text-sm text-muted">@{profile.username}</p>}

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
      <p className="mt-8 text-[12px] text-muted">v {__BUILD__} · {u("rol")}: {profile?.role === "admin" ? "admin" : u("oddiy")}</p>
    </div>
  );
}
