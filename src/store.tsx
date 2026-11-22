import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "./lib/api";
import { toNew, toOld } from "./lib/alphabet";
import { configured } from "./lib/supabase";
import { haptic, tg } from "./lib/tg";
import { applyTheme, loadTheme, saveTheme, systemDark, type Theme } from "./lib/theme";

type Status = "loading" | "ready" | "guest" | "unconfigured";
type Alpha = "new" | "old";
/** id bo‘lsa tahrirlash, bo‘lmasa yangi joylash. */
export type PublishInput =
  | { kind: "thought"; id?: number; category: api.Category; title: string; body: string }
  | { kind: "short"; id?: number; category: api.Category; quote: string; tone: api.Short["tone"]; videoUrl: string | null; oldVideoUrl?: string | null };

export type ComposerState =
  | null
  | { mode: "new" }
  | { mode: "edit"; kind: "thought"; id: number; category: api.Category; title: string; body: string }
  | { mode: "edit"; kind: "short"; id: number; category: api.Category; quote: string; tone: api.Short["tone"]; video_url: string | null };

type Store = {
  status: Status;
  loginError: string;
  profile: api.Profile | null;
  alphabet: Alpha;
  theme: Theme;
  /** Hozir qorong‘i ko‘rinyaptimi ("auto" bo‘lsa tizim sozlamasiga qarab). */
  dark: boolean;
  setTheme: (t: Theme) => void;
  /** Interfeys matni: manba ESKI alifboda yoziladi, ko‘rsatishda tanlangan alifboga o‘giriladi. */
  u: (oldSource: string) => string;
  /** Baza matni: KANONIK (yangi) alifboda saqlanadi, kerak bo‘lsa eskiga o‘giriladi. */
  c: (canonical: string) => string;
  thoughts: api.Thought[];
  shorts: api.Short[];
  stats: api.Stats | null;
  /** Fikr ochilganda chaqiriladi: o‘qilganini yozadi va profil ko‘rsatkichlarini yangilaydi. */
  markRead: (id: number) => void;
  notice: string;
  search: (q: string) => void;
  react: (t: api.Thought, kind: "like" | "save") => void;
  changeAlphabet: (a: Alpha) => void;
  canWrite: boolean;
  publish: (p: PublishInput) => Promise<boolean>;
  remove: (kind: "thought" | "short", id: number) => Promise<void>;
  composer: ComposerState;
  setComposer: (c: ComposerState) => void;
};

const Ctx = createContext<Store>(null!);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<api.Profile | null>(null);
  const [thoughts, setThoughts] = useState<api.Thought[]>([]);
  const [shorts, setShorts] = useState<api.Short[]>([]);
  const [stats, setStats] = useState<api.Stats | null>(null);
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");
  const [composer, setComposer] = useState<ComposerState>(null);
  const timer = useRef<number>();
  const [theme, setThemeState] = useState<Theme>(loadTheme);
  const [sysDark, setSysDark] = useState(systemDark);
  const dark = theme === "dark" || (theme === "auto" && sysDark);
  const setTheme = useCallback((t: Theme) => { saveTheme(t); setThemeState(t); }, []);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const on = () => setSysDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => applyTheme(theme), [theme, sysDark]);

  const alphabet: Alpha = profile?.alphabet ?? "new";
  const u = useCallback((s: string) => (alphabet === "old" ? s : toNew(s)), [alphabet]);
  const c = useCallback((s: string) => (alphabet === "old" ? toOld(s) : s), [alphabet]);

  const flash = useCallback((m: string) => {
    setNotice(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(""), 2200);
  }, []);

  useEffect(() => {
    tg()?.ready();
    tg()?.expand();
    if (!configured) return setStatus("unconfigured");
    (async () => {
      const l = await api.login();
      if (!l.ok) {
        setLoginError(l.error ?? "");
        return setStatus("guest");
      }
      const [p, f, s, st] = await Promise.allSettled([api.getProfile(), api.getFeed(), api.getShorts(), api.getStats()]);
      if (p.status === "fulfilled") setProfile(p.value);
      if (f.status === "fulfilled") setThoughts(f.value);
      if (s.status === "fulfilled") setShorts(s.value);
      if (st.status === "fulfilled") setStats(st.value);
      setStatus("ready");
    })();
  }, []);

  const search = useCallback((q: string) => {
    api.getFeed(q).then(setThoughts).catch(() => flash("Qidirib bo‘lmadi"));
  }, [flash]);

  const react: Store["react"] = (t, kind) => {
    const on = kind === "like" ? !t.liked : !t.saved;
    const patch = (x: api.Thought) => (kind === "like" ? { ...x, liked: on, likes: x.likes + (on ? 1 : -1) } : { ...x, saved: on });
    haptic.tap();
    setThoughts((v) => v.map((x) => (x.id === t.id ? patch(x) : x)));
    api.setReaction(t.id, kind, on)
      .catch(() => {
        setThoughts((v) => v.map((x) => (x.id === t.id ? t : x)));
        haptic.err();
        flash("Amal bajarilmadi");
      });
  };

  const markRead = useCallback((id: number) => {
    api.recordRead(id).then(() => api.getStats().then(setStats)).catch(() => {});
  }, []);

  const changeAlphabet: Store["changeAlphabet"] = (a) => {
    setProfile((p) => (p ? { ...p, alphabet: a } : p));
    api.setAlphabet(a).catch(() => flash("Sozlama saqlanmadi"));
  };

  const canWrite = profile?.role === "admin";
  const publish: Store["publish"] = async (p) => {
    if (!profile || !canWrite) return false;
    try {
      if (p.kind === "thought") {
        const body = { category: p.category, title: p.title, body: p.body };
        if (p.id) await api.updateThought(p.id, body);
        else await api.createThought(profile.id, body);
        setThoughts(await api.getFeed());
      } else {
        const body = { category: p.category, quote: p.quote, tone: p.tone, video_url: p.videoUrl };
        if (p.id) await api.updateShort(p.id, body);
        else await api.createShort(body);
        if (p.oldVideoUrl && p.oldVideoUrl !== p.videoUrl) void api.removeVideo(p.oldVideoUrl);
        setShorts(await api.getShorts());
      }
      haptic.ok();
      flash(p.id ? "Saqlandi" : "Joylandi");
      return true;
    } catch (e) {
      haptic.err();
      flash(`Saqlab bo‘lmadi${e instanceof Error ? ": " + e.message : ""}`.slice(0, 140));
      return false;
    }
  };

  const remove: Store["remove"] = async (kind, id) => {
    if (!canWrite) return;
    try {
      if (kind === "thought") {
        await api.deleteThought(id);
        setThoughts((v) => v.filter((x) => x.id !== id));
      } else {
        const video = shorts.find((x) => x.id === id)?.video_url ?? null;
        await api.deleteShort(id);
        void api.removeVideo(video);
        setShorts((v) => v.filter((x) => x.id !== id));
      }
      haptic.ok();
      flash("O‘chirildi");
    } catch (e) {
      haptic.err();
      flash(`O‘chirib bo‘lmadi${e instanceof Error ? ": " + e.message : ""}`.slice(0, 140));
    }
  };

  const value = useMemo<Store>(
    () => ({ status, loginError, profile, alphabet, theme, dark, setTheme, u, c, thoughts, shorts, stats, markRead, notice, search, react, changeAlphabet, canWrite, publish, remove, composer, setComposer }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, loginError, profile, alphabet, theme, dark, setTheme, u, c, thoughts, shorts, stats, markRead, notice, canWrite, composer],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
