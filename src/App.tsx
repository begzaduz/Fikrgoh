import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Compass, Home as HomeIcon, Plus, UserRound } from "lucide-react";
import { Composer } from "./components/Composer";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Shorts } from "./pages/Shorts";
import { useApp } from "./store";

type Tab = "home" | "shorts" | "profile";
const TABS = [
  { id: "home", label: "Bosh sahifa", Icon: HomeIcon },
  { id: "shorts", label: "Shorts", Icon: Compass, raw: true },
  { id: "profile", label: "Profil", Icon: UserRound },
] as const;

export default function App() {
  const { status, loginError, notice, u, canWrite } = useApp();
  const [tab, setTab] = useState<Tab>("home");
  const [writing, setWriting] = useState(false);

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
        {TABS.map(({ id, label, Icon, ...rest }) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
            className={`flex min-h-[48px] flex-1 flex-col items-center gap-0.5 text-[12px] font-semibold ${tab === id ? "text-clay" : "text-muted"}`}>
            <Icon size={20} />
            {"raw" in rest ? label : u(label)}
          </button>
        ))}
      </nav>
      {canWrite && tab !== "profile" && (
        <button onClick={() => setWriting(true)} aria-label={u("Yangi fikr")}
          className="absolute bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-clay text-onclay shadow-lg">
          <Plus size={26} />
        </button>
      )}
      <AnimatePresence>{writing && <Composer onClose={() => setWriting(false)} />}</AnimatePresence>
      {notice && <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper">{notice}</div>}
    </div>
  );
}
