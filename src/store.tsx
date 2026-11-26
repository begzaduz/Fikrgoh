import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "./lib/api";
import { slideUrls, type Slide } from "./lib/slides";
import type { ContentBlock } from "./lib/content";
import { toNew, toOld } from "./lib/alphabet";
import { configured } from "./lib/supabase";
import { haptic, tg } from "./lib/tg";
import { applyTheme, loadTheme, saveTheme, systemDark, type Theme } from "./lib/theme";

type Status = "loading" | "ready" | "guest" | "unconfigured";
type Alpha = "new" | "old";
/** id bo‘lsa tahrirlash, bo‘lmasa yangi joylash. */
export type PublishInput =
  | { kind: "thought"; id?: number; category: api.Category; title: string; body: string; format?: api.Thought["format"]; blocks?: ContentBlock[] | null; slides?: Slide[] | null; imageUrl?: string | null; oldImageUrl?: string | null; oldSlides?: Slide[] | null; oldBlocks?: api.ContentBlock[] | null }
  | { kind: "short"; id?: number; category: api.Category; quote: string; tone: api.Short["tone"]; videoUrl: string | null; oldVideoUrl?: string | null; slides?: Slide[] | null; oldSlides?: Slide[] | null };

export type ComposerState =
  | null
  | { mode: "new" }
  | { mode: "edit"; kind: "thought"; id: number; category: api.Category; title: string; body: string; image_url?: string | null; format?: api.Thought["format"]; blocks?: api.ContentBlock[] | null; slides?: Slide[] | null }
  | { mode: "edit"; kind: "short"; id: number; category: api.Category; quote: string; tone: api.Short["tone"]; video_url: string | null; slides: Slide[] | null };

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
  statsError: string;
  reloadStats: () => void;
  history: api.HistoryItem[];
  /** Boshqa sahifadan ("Saqlanganlar", markaziy tugma) fikrni ochish so‘rovi: Bosh sahifa o‘qib, tozalaydi. */
  pendingOpen: number | null;
  requestOpen: (id: number) => void;
  clearOpen: () => void;
  /** Qidiruvdan tanlangan fikrni lentaga qo‘shadi (bosh sahifa uni ocha olishi uchun). */
  injectThought: (t: api.Thought) => void;
  /** Fikr ochilganda chaqiriladi: o‘qilganini yozadi va profil ko‘rsatkichlarini yangilaydi. */
  markRead: (id: number) => void;
  notice: string;
  hasMore: boolean;
  loadMore: () => void;
  react: (t: api.Thought, kind: "like" | "save") => void;
  reactShort: (s: api.Short) => void;
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
  const [statsError, setStatsError] = useState("");
  const [history, setHistory] = useState<api.HistoryItem[]>([]);
  const [pendingOpen, setPendingOpen] = useState<number | null>(null);
  const requestOpen = useCallback((id: number) => setPendingOpen(id), []);
  const clearOpen = useCallback(() => setPendingOpen(null), []);
  const injectThought = useCallback((t: api.Thought) => setThoughts((v) => (v.some((x) => x.id === t.id) ? v : [t, ...v])), []);
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");
  const [composer, setComposer] = useState<ComposerState>(null);
  const timer = useRef<number>();
  const thoughtsRef = useRef<api.Thought[]>([]);
  thoughtsRef.current = thoughts;
  const [hasMore, setHasMore] = useState(false);
  const feedSeq = useRef(0);     // eskirgan javoblarni tashlab yuborish uchun
  const loadingMore = useRef(false);
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
      const [p, f, s, st, h] = await Promise.allSettled([api.getProfile(), api.getFeed(), api.getShorts(), api.getStats(), api.getHistory()]);
      if (p.status === "fulfilled") setProfile(p.value);
      if (f.status === "fulfilled") { setThoughts(f.value); setHasMore(f.value.length >= api.PAGE); }
      if (s.status === "fulfilled") setShorts(s.value);
      if (st.status === "fulfilled") setStats(st.value);
      else setStatsError(st.reason instanceof Error ? st.reason.message : "noma’lum xato");
      if (h.status === "fulfilled") setHistory(h.value);
      setStatus("ready");
    })();
  }, []);

  const reloadStats = useCallback(() => {
    setStatsError("");
    Promise.all([api.getStats(), api.getHistory()])
      .then(([st, h]) => { setStats(st); setHistory(h); })
      .catch((e) => setStatsError(e instanceof Error ? e.message : "noma’lum xato"));
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    const seq = feedSeq.current;
    api.getFeed("", thoughtsRef.current.length)
      .then((rows) => {
        if (seq !== feedSeq.current) return;
        setThoughts((v) => [...v, ...rows.filter((r) => !v.some((x) => x.id === r.id))]);
        setHasMore(rows.length >= api.PAGE);
      })
      .catch(() => flash("Yana yuklab bo‘lmadi"))
      .finally(() => { loadingMore.current = false; });
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

  const reactShort: Store["reactShort"] = (sh) => {
    const on = !sh.liked;
    haptic.tap();
    setShorts((v) => v.map((x) => (x.id === sh.id ? { ...x, liked: on, likes: x.likes + (on ? 1 : -1) } : x)));
    api.setShortLike(sh.id, on).catch(() => {
      setShorts((v) => v.map((x) => (x.id === sh.id ? sh : x)));
      haptic.err();
      flash("Amal bajarilmadi");
    });
  };

  const markRead = useCallback((id: number) => {
    api.recordRead(id).then(() => Promise.all([api.getStats().then(setStats), api.getHistory().then(setHistory)])).catch(() => {});
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
        // image_url faqat rasm bor (yoki olib tashlanayotgan) bo‘lsa yuboriladi: 0008 migratsiyasisiz ham eski yozish ishlayveradi.
        const withImg = p.imageUrl || p.oldImageUrl ? { image_url: p.imageUrl ?? null } : {};
        const body = { category: p.category, title: p.title, body: p.body, format: p.format ?? "article" as const, blocks: p.blocks ?? null, slides: p.slides ?? null, ...withImg };
        if (p.id) await api.updateThought(p.id, body);
        else await api.createThought(profile.id, body);
        if (p.oldImageUrl && p.oldImageUrl !== p.imageUrl) void api.removeVideo(p.oldImageUrl);
        const keepSlides = new Set(slideUrls(p.slides));
        slideUrls(p.oldSlides).filter((x) => !keepSlides.has(x)).forEach((x) => void api.removeVideo(x));
        const keepBlocks = new Set((p.blocks ?? []).filter((b) => b.type === "image" && b.url).map((b) => b.url!));
        (p.oldBlocks ?? []).filter((b) => b.type === "image" && b.url && !keepBlocks.has(b.url)).forEach((b) => void api.removeVideo(b.url!));
        const rows = await api.getFeed();
        feedSeq.current++;
        setThoughts(rows);
        setHasMore(rows.length >= api.PAGE);
      } else {
        const body = { category: p.category, quote: p.quote, tone: p.tone, video_url: p.videoUrl, slides: p.slides?.length ? p.slides : null };
        if (p.id) await api.updateShort(p.id, body);
        else await api.createShort(body);
        if (p.oldVideoUrl && p.oldVideoUrl !== p.videoUrl) void api.removeVideo(p.oldVideoUrl);
        const keep = new Set(slideUrls(p.slides));
        slideUrls(p.oldSlides).filter((x) => !keep.has(x)).forEach((x) => void api.removeVideo(x));
        setShorts(await api.getShorts());
      }
      haptic.ok();
      flash(p.id ? "Saqlandi" : "Joylandi");
      return true;
    } catch (e) {
      haptic.err();
      const m = e instanceof Error ? e.message : "";
      flash(/category_check/.test(m) ? "Bazada 0006_categories.sql ishga tushirilmagan" : /image_url/.test(m) ? "Bazada 0008_thought_image.sql ishga tushirilmagan" : /format|blocks|column.*slides/i.test(m) ? "Bazada 0010_editorial_thoughts.sql migratsiyasini ishga tushiring" : /slides/.test(m) ? "Bazada 0009_slides.sql ishga tushirilmagan" : `Saqlab bo‘lmadi${m ? ": " + m : ""}`.slice(0, 140));
      return false;
    }
  };

  const remove: Store["remove"] = async (kind, id) => {
    if (!canWrite) return;
    try {
      if (kind === "thought") {
        const oldThought = thoughts.find((x) => x.id === id);
        await api.deleteThought(id);
        void api.removeVideo(oldThought?.image_url ?? null);
        slideUrls(oldThought?.slides).forEach((x) => void api.removeVideo(x));
        (oldThought?.blocks ?? []).filter((b) => b.type === "image" && b.url).forEach((b) => void api.removeVideo(b.url!));
        setThoughts((v) => v.filter((x) => x.id !== id));
      } else {
        const old = shorts.find((x) => x.id === id);
        await api.deleteShort(id);
        void api.removeVideo(old?.video_url ?? null);
        slideUrls(old?.slides).forEach((x) => void api.removeVideo(x));
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
    () => ({ status, loginError, profile, alphabet, theme, dark, setTheme, u, c, thoughts, shorts, stats, statsError, reloadStats, history, pendingOpen, requestOpen, clearOpen, injectThought, markRead, notice, hasMore, loadMore, react, reactShort, changeAlphabet, canWrite, publish, remove, composer, setComposer }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, loginError, profile, alphabet, theme, dark, setTheme, u, c, thoughts, shorts, stats, statsError, reloadStats, history, pendingOpen, requestOpen, clearOpen, injectThought, markRead, notice, hasMore, canWrite, composer],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
