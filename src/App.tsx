import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Bookmark, Clapperboard, House, Plus, UserRound } from "lucide-react";
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
  const { status, loginError, notice, u, canWrite, composer, setComposer } = useApp();
  const [tab, setTab] = useState<Tab>("home");
  const [entered, setEntered] = useState(false);
  const [opening, setOpening] = useState(false);

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
    const item = (id: Tab, aria: string, Icon: typeof House, raw = false) => {
      const on = tab === id;
      const name = raw ? aria : u(aria);
      return (
        <button key={id} onClick={() => setTab(id)} aria-label={name} title={name} aria-current={on ? "page" : undefined}
          className={`relative flex h-12 items-center justify-center gap-2 rounded-full ${on ? "px-4 text-onclay" : "w-12 text-muted"}`}>
          {on && (
            <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-clay"
              transition={{ type: "spring", stiffness: 420, damping: 34 }} />
          )}
          <Icon size={22} strokeWidth={on ? 2.2 : 1.7} className="relative" />
          {on && (
            <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} transition={{ duration: 0.22 }}
              className="relative overflow-hidden whitespace-nowrap text-[13px] font-semibold">
              {name}
            </motion.span>
          )}
        </button>
      );
    };
    content = (
      <div className="relative mx-auto flex h-full max-w-[560px] flex-col">
        <header className="flex min-h-[56px] items-center justify-center px-5 pb-1 pt-[calc(8px+var(--safe-top))]">
          <Wordmark spinStar className="h-[36px] w-auto" />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {tab === "home" ? <Home /> : tab === "shorts" ? <Shorts /> : tab === "saved" ? <Saved onOpen={() => setTab("home")} /> : <Profile />}
        </main>
        {canWrite && tab === "home" && !composer && (
          <button onClick={() => setComposer({ mode: "new" })} aria-label={u("Yangi fikr")} title={u("Yangi fikr")}
            className="absolute bottom-[calc(84px+env(safe-area-inset-bottom,0px))] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-clay text-onclay shadow-lg">
            <Plus size={28} />
          </button>
        )}
        <MotionConfig reducedMotion="user">
          <nav className="glass mx-3 mb-[calc(8px+env(safe-area-inset-bottom,0px))] mt-1 flex items-center justify-between rounded-full p-1.5">
            {item("home", "Bosh sahifa", House)}
            {item("shorts", "Shorts", Clapperboard, true)}
            {item("saved", "Saqlanganlar", Bookmark)}
            {item("profile", "Profil", UserRound)}
          </nav>
        </MotionConfig>
        <AnimatePresence>{composer && <Composer key={composer.mode === "edit" ? `${composer.kind}-${composer.id}` : "new"} state={composer} onClose={() => setComposer(null)} />}</AnimatePresence>
        {notice && <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-paper">{u(notice)}</div>}
      </div>
    );
  }

  return (
    <>
      {/* Intro ochiq turganda orqadagi ilova bosilmaydi va ekran o‘qigichga ko‘rinmaydi. */}
      {/* Parda ochila boshlaganda bosh sahifa biroz kattaroqdan "joyiga tushadi" (tugagach transform qolmaydi). */}
      <motion.div className="h-full" initial={false} animate={{ scale: opening ? 1 : 1.08, opacity: opening ? 1 : 0.5 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        {...(!entered ? ({ inert: "" } as object) : {})}>{content}</motion.div>
      <AnimatePresence>{!entered && <Intro key="intro" ready={status !== "loading"} onOpen={() => setOpening(true)} onEnter={() => { setOpening(true); setEntered(true); }} />}</AnimatePresence>
    </>
  );
}
