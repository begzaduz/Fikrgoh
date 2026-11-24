import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Clapperboard, House, Moon, Plus, Sparkles, Sun, UserRound } from "lucide-react";
import { Composer } from "./components/Composer";
import { Intro } from "./components/Intro";
import { Wordmark } from "./components/Wordmark";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Saved } from "./pages/Saved";
import { Shorts } from "./pages/Shorts";
import { useApp } from "./store";

type Tab = "home" | "shorts" | "saved" | "profile";

export default function App() {
  const { status, loginError, notice, u, canWrite, composer, setComposer, dark, setTheme, profile, thoughts, requestOpen } = useApp();
  const [tab, setTab] = useState<Tab>("home");
  const [entered, setEntered] = useState(false);
  const [opening, setOpening] = useState(false);

  /** Markaziy tugma: admin uchun "yangi fikr", o‘quvchi uchun tasodifiy fikr. */
  const center = () => {
    if (canWrite) return setComposer({ mode: "new" });
    const t = thoughts[Math.floor(Math.random() * thoughts.length)];
    if (t) { requestOpen(t.id); setTab("home"); }
  };

  let content;
  if (status === "loading") content = null;
  else if (status === "unconfigured")
    content = <p className="p-8 text-sm">VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY sozlanmagan (.env.example'ga qarang).</p>;
  else if (status === "guest")
    content = (
      <div className="p-8 text-sm">
        <Wordmark className="h-[22px] w-auto" />
        <p className="mt-8">{u("Kirish amalga oshmadi.")}</p>
        {loginError && <p className="mt-3 break-words text-muted">{loginError}</p>}
        <p className="mt-3 text-muted">{u("Fikrgoh'ni Telegram ichida oching.")}</p>
        <p className="mt-8 text-[12px] text-muted">v {__BUILD__}</p>
      </div>
    );
  else {
    const item = (id: Tab, aria: string, icon: React.ReactNode, raw = false) => {
      const on = tab === id;
      const name = raw ? aria : u(aria);
      return (
        <button key={id} onClick={() => setTab(id)} aria-label={name} title={name} aria-current={on ? "page" : undefined}
          className={`flex min-h-[56px] flex-1 items-center justify-center ${on ? "text-clay" : "text-muted"}`}>
          {icon}
        </button>
      );
    };
    const ic = (I: typeof House, id: Tab) => <I size={26} strokeWidth={tab === id ? 2.2 : 1.7} />;
    content = (
      <div className="relative mx-auto flex h-full max-w-[560px] flex-col">
        <header className="flex items-center justify-between px-4 pb-1 pt-[calc(8px+var(--safe-top))]">
          <button onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? u("Kunduzgi rejim") : u("Tungi rejim")} className="glass flex h-11 w-11 items-center justify-center rounded-full text-ink">
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="glass flex h-11 items-center rounded-full px-5"><Wordmark className="h-[20px] w-auto" /></div>
          <button onClick={() => setTab("profile")} aria-label={u("Mening profilim")} className="flex h-11 w-11 items-center justify-center rounded-full bg-clay text-[16px] font-bold text-onclay">
            {(profile?.first_name ?? "F").slice(0, 1).toUpperCase()}
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {tab === "home" ? <Home goProfile={() => setTab("profile")} /> : tab === "shorts" ? <Shorts /> : tab === "saved" ? <Saved onOpen={() => setTab("home")} /> : <Profile />}
        </main>
        <nav className="glass mx-3 mb-[calc(8px+env(safe-area-inset-bottom,0px))] mt-1 flex items-center rounded-[30px] px-2">
          {item("home", "Bosh sahifa", ic(House, "home"))}
          {item("shorts", "Shorts", ic(Clapperboard, "shorts"), true)}
          <button onClick={center} aria-label={canWrite ? u("Yangi fikr") : u("Tasodifiy fikr")} title={canWrite ? u("Yangi fikr") : u("Tasodifiy fikr")}
            className="mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-sand text-clay">
            {canWrite ? <Plus size={28} /> : <Sparkles size={26} />}
          </button>
          {item("saved", "Saqlanganlar", ic(Bookmark, "saved"))}
          {item("profile", "Profil", ic(UserRound, "profile"))}
        </nav>
        <AnimatePresence>{composer && <Composer key={composer.mode === "edit" ? `${composer.kind}-${composer.id}` : "new"} state={composer} onClose={() => setComposer(null)} />}</AnimatePresence>
        {notice && <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-paper">{u(notice)}</div>}
      </div>
    );
  }

  return (
    <>
      {/* Intro ochiq turganda orqadagi ilova bosilmaydi va ekran o‘qigichga ko‘rinmaydi. */}
      {/* Parda ochila boshlaganda bosh sahifa biroz kattaroqdan "joyiga tushadi" (tugagach transform qolmaydi). */}
      <motion.div className="h-full" initial={false} animate={{ scale: opening ? 1 : 1.08, opacity: opening ? 1 : 0.5 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        {...(!entered ? ({ inert: "" } as object) : {})}>{content}</motion.div>
      <AnimatePresence>{!entered && <Intro key="intro" ready={status !== "loading"} onOpen={() => setOpening(true)} onEnter={() => { setOpening(true); setEntered(true); }} />}</AnimatePresence>
    </>
  );
}
