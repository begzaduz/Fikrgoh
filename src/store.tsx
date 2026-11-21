import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "./lib/api";
import { toNew, toOld } from "./lib/alphabet";
import { configured } from "./lib/supabase";
import { haptic, tg } from "./lib/tg";

type Status = "loading" | "ready" | "guest" | "unconfigured";
type Alpha = "new" | "old";

type Store = {
  status: Status;
  loginError: string;
  profile: api.Profile | null;
  alphabet: Alpha;
  /** Interfeys matni: manba ESKI alifboda yoziladi, ko‘rsatishda tanlangan alifboga o‘giriladi. */
  u: (oldSource: string) => string;
  /** Baza matni: KANONIK (yangi) alifboda saqlanadi, kerak bo‘lsa eskiga o‘giriladi. */
  c: (canonical: string) => string;
  thoughts: api.Thought[];
  shorts: api.Short[];
  daily: api.Daily | null;
  answers: api.MyAnswer[];
  notice: string;
  search: (q: string) => void;
  react: (t: api.Thought, kind: "like" | "save") => void;
  answer: (index: number, body: string) => Promise<boolean>;
  changeAlphabet: (a: Alpha) => void;
};

const Ctx = createContext<Store>(null!);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<api.Profile | null>(null);
  const [thoughts, setThoughts] = useState<api.Thought[]>([]);
  const [shorts, setShorts] = useState<api.Short[]>([]);
  const [daily, setDaily] = useState<api.Daily | null>(null);
  const [answers, setAnswers] = useState<api.MyAnswer[]>([]);
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");
  const timer = useRef<number>();

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
      const [p, f, s, d, a] = await Promise.allSettled([api.getProfile(), api.getFeed(), api.getShorts(), api.getDaily(), api.getAnswers()]);
      if (p.status === "fulfilled") setProfile(p.value);
      if (f.status === "fulfilled") setThoughts(f.value);
      if (s.status === "fulfilled") setShorts(s.value);
      if (d.status === "fulfilled") setDaily(d.value);
      if (a.status === "fulfilled") setAnswers(a.value);
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
      .then(() => api.getDaily().then(setDaily).catch(() => {}))
      .catch(() => {
        setThoughts((v) => v.map((x) => (x.id === t.id ? t : x)));
        haptic.err();
        flash("Amal bajarilmadi");
      });
  };

  const answer: Store["answer"] = async (index, body) => {
    try {
      const d = await api.saveAnswer(index, body);
      setDaily(d);
      api.getAnswers().then(setAnswers).catch(() => {});
      haptic.ok();
      return true;
    } catch {
      haptic.err();
      flash("Saqlab bo‘lmadi");
      return false;
    }
  };

  const changeAlphabet: Store["changeAlphabet"] = (a) => {
    setProfile((p) => (p ? { ...p, alphabet: a } : p));
    api.setAlphabet(a).catch(() => flash("Sozlama saqlanmadi"));
  };

  const value = useMemo<Store>(
    () => ({ status, loginError, profile, alphabet, u, c, thoughts, shorts, daily, answers, notice, search, react, answer, changeAlphabet }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, loginError, profile, alphabet, u, c, thoughts, shorts, daily, answers, notice],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
