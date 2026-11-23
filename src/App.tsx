import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Composer } from "./components/Composer";
import { Intro } from "./components/Intro";
import { Wordmark } from "./components/Wordmark";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Shorts } from "./pages/Shorts";
import { useApp } from "./store";

type Tab = "home" | "shorts" | "profile";

/** aria — ekran o‘qigich nomi (avvalgidek), label — ko‘rinadigan qisqa yozuv. */
const TABS = [
  { id: "home", aria: "Bosh sahifa", label: "Fikrlar" },
  { id: "shorts", aria: "Shorts", label: "Shorts", raw: true },
  { id: "profile", aria: "Profil", label: "Profil" },
] as const;

const mono = "font-mono text-[11px] uppercase tracking-[0.14em]";

export default function App() {
  const { status, loginError, notice, u, canWrite, composer, setComposer, dark, setTheme } = useApp();
  const [tab, setTab] = useState<Tab>("home");
  const [entered, setEntered] = useState(false);

  let content;
  if (status === "loading") content = null;
  else if (status === "unconfigured")
    content = <p className="p-8 text-sm">VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY sozlanmagan (.env.example'ga qarang).</p>;
  else if (status === "guest")
    content = (
      <div className="p-8 text-sm">
        <Wordmark className="h-[15px] w-auto" />
        <p className="mt-8">{u("Kirish amalga oshmadi.")}</p>
        {loginError && <p className="mt-3 break-words text-muted">{loginError}</p>}
        <p className="mt-3 text-muted">{u("Fikrnomiya'ni Telegram ichida oching.")}</p>
        <p className={`mt-8 text-muted ${mono}`}>v {__BUILD__}</p>
      </div>
    );
  else
    content = (
      <div className="relative mx-auto flex h-full max-w-[560px] flex-col">
        <header className="flex items-center justify-between border-b border-ink px-5 pb-2.5 pt-[calc(12px+var(--safe-top))]">
          <Wordmark className="h-[15px] w-auto" />
          <div className={`-mr-3 flex items-center ${mono}`}>
            {canWrite && tab !== "profile" && (
              <button onClick={() => setComposer({ mode: "new" })} aria-label={u("Yangi fikr")} className="min-h-[44px] px-3 text-clay">+ {u("Yangi")}</button>
            )}
            <button onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? u("Kunduzgi rejim") : u("Tungi rejim")} className="min-h-[44px] px-3 text-muted">
              {dark ? u("Kun") : u("Tun")}
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {tab === "home" ? <Home /> : tab === "shorts" ? <Shorts /> : <Profile />}
        </main>
        <nav className="flex border-t border-ink bg-paper pb-[env(safe-area-inset-bottom,0px)]">
          {TABS.map((t, i) => {
            const on = tab === t.id;
            const name = "raw" in t ? t.aria : u(t.aria);
            return (
              <button key={t.id} onClick={() => setTab(t.id)} aria-label={name} title={name} aria-current={on ? "page" : undefined}
                className={`relative flex min-h-[56px] flex-1 items-center justify-center ${mono} ${on ? "text-ink" : "text-muted"} ${i > 0 ? "border-l border-line" : ""}`}>
                {on && <span className="absolute inset-x-0 top-0 h-[3px] bg-clay" aria-hidden="true" />}
                {"raw" in t ? t.label : u(t.label)}
              </button>
            );
          })}
        </nav>
        <AnimatePresence>{composer && <Composer key={composer.mode === "edit" ? `${composer.kind}-${composer.id}` : "new"} state={composer} onClose={() => setComposer(null)} />}</AnimatePresence>
        {notice && <div role="status" className={`fixed left-1/2 top-20 z-[60] -translate-x-1/2 bg-ink px-4 py-2.5 text-paper ${mono}`}>{u(notice)}</div>}
      </div>
    );

  return (
    <>
      {/* Intro ochiq turganda orqadagi ilova bosilmaydi va ekran o‘qigichga ko‘rinmaydi. */}
      <div className="h-full" {...(!entered ? ({ inert: "" } as object) : {})}>{content}</div>
      <AnimatePresence>{!entered && <Intro key="intro" ready={status !== "loading"} onEnter={() => setEntered(true)} />}</AnimatePresence>
    </>
  );
}
