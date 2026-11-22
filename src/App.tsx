import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Home as HomeIcon, Plus, UserRound } from "lucide-react";
import { Composer } from "./components/Composer";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Shorts } from "./pages/Shorts";
import { useApp } from "./store";

type Tab = "home" | "shorts" | "profile";

/** Shorts belgisi: vertikal (9:16) ekran ichida "play". Faol holatda ichi to‘ladi. */
function ShortsIcon({ size = 26, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="3.2" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      <path d="M10.5 9.2v5.6l4.6-2.8z" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}
const TABS = [
  { id: "home", label: "Bosh sahifa" },
  { id: "shorts", label: "Shorts", raw: true },
  { id: "profile", label: "Profil" },
] as const;

export default function App() {
  const { status, loginError, notice, u, canWrite, composer, setComposer } = useApp();
  const [tab, setTab] = useState<Tab>("home");

  if (status === "loading") return <p className="p-8 text-muted">…</p>;
  if (status === "unconfigured")
    return <p className="p-8 text-sm">VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY sozlanmagan (.env.example'ga qarang).</p>;
  if (status === "guest")
    return (
      <div className="p-8 text-sm">
        <p>{u("Kirish amalga oshmadi.")}</p>
        {loginError && <p className="mt-3 break-words text-muted">{loginError}</p>}
        <p className="mt-3 text-muted">{u("Fikrnoma'ni Telegram ichida oching.")}</p>
        <p className="mt-6 text-[12px] text-muted">v {__BUILD__}</p>
      </div>
    );

  return (
    <div className="relative mx-auto flex h-full max-w-[560px] flex-col">
      <header className="flex items-center justify-between border-b border-line px-5 pb-2.5 pt-[calc(10px+var(--safe-top))]">
        <span className="font-serif text-2xl font-bold">fikrnoma<span className="text-clay">.</span></span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === "home" ? <Home /> : tab === "shorts" ? <Shorts /> : <Profile />}
      </main>
      <nav className="flex border-t border-line bg-paper px-2 pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5">
        {TABS.map((t) => {
          const on = tab === t.id;
          const name = "raw" in t ? t.label : u(t.label);
          return (
            <button key={t.id} onClick={() => setTab(t.id)} aria-label={name} title={name} aria-current={on ? "page" : undefined}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 ${on ? "text-clay" : "text-muted"}`}>
              {t.id === "home" ? <HomeIcon size={26} strokeWidth={on ? 2.3 : 1.8} /> : t.id === "shorts" ? <ShortsIcon active={on} /> : <UserRound size={26} strokeWidth={on ? 2.3 : 1.8} />}
              <span className={`h-1 w-1 rounded-full ${on ? "bg-clay" : "bg-transparent"}`} aria-hidden="true" />
            </button>
          );
        })}
      </nav>
      {canWrite && tab !== "profile" && (
        <button onClick={() => setComposer({ mode: "new" })} aria-label={u("Yangi fikr")}
          className="absolute bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-clay text-onclay shadow-lg">
          <Plus size={26} />
        </button>
      )}
      <AnimatePresence>{composer && <Composer key={composer.mode === "edit" ? `${composer.kind}-${composer.id}` : "new"} state={composer} onClose={() => setComposer(null)} />}</AnimatePresence>
      {notice && <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper">{u(notice)}</div>}
    </div>
  );
}
