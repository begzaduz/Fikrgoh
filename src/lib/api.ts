import { supabase } from "./supabase";
import { tg } from "./tg";

export type Category = "fikr" | "mindset" | "madaniyat";
export type Thought = { id: number; category: Category; title: string; body: string; read_minutes: number; created_at: string; likes: number; liked: boolean; saved: boolean };
export type Short = { id: number; category: Category; quote: string; tone: "sand" | "sage" | "ink" | "clay" };
export type Daily = {
  day: string;
  questions: Array<{ index: number; text: string; answer: string | null }>;
  done: number; streak: number; points: number; level: 0 | 1 | 2; levelFrom: number; levelTo: number;
};
export type MyAnswer = { day: string; idx: number; question: string; body: string };
export type Profile = { id: string; first_name: string; username: string | null; role: "reader" | "admin"; alphabet: "new" | "old" };

const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error || r.data === null) throw new Error(r.error?.message ?? "no data");
  return r.data;
};

/** Telegram initData bilan kiradi (sinov rejimida: DEV_AUTH yoqilgan bo‘lsa, dev foydalanuvchi bilan). */
export async function login(): Promise<{ ok: boolean; error?: string }> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return { ok: true };
  const initData = tg()?.initData;
  const body = initData ? { initData } : import.meta.env.DEV ? { dev: { telegramId: 100001, firstName: "Bekzod" } } : null;
  if (!body) return { ok: false, error: "Telegram ma’lumoti (initData) kelmadi" };
  // Oddiy fetch: faqat funksiya ruxsat bergan sarlavhalar (content-type, apikey, authorization) yuboriladi.
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  let res: Response;
  try {
    res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swift-processor`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: `Tarmoq xatosi (${e instanceof Error ? e.message : "noma’lum"})` };
  }
  const out = (await res.json().catch(() => null)) as { access_token?: string; refresh_token?: string; error?: string; message?: string } | null;
  if (!res.ok || !out?.access_token) return { ok: false, error: `${res.status}: ${out?.error ?? out?.message ?? "javob noto‘g‘ri"}` };
  const set = await supabase.auth.setSession({ access_token: out.access_token, refresh_token: out.refresh_token ?? "" });
  return set.error ? { ok: false, error: set.error.message } : { ok: true };
}

export const getProfile = async () => must(await supabase.from("profiles").select("id, first_name, username, role, alphabet").single()) as Profile;
export const setAlphabet = async (alphabet: "new" | "old") => {
  const r = await supabase.from("profiles").update({ alphabet }).not("id", "is", null);
  if (r.error) throw new Error(r.error.message);
};
export const getFeed = async (q = "") => must(await supabase.rpc("feed", { p_q: q || null, p_limit: 30 })) as Thought[];
export const getShorts = async () => must(await supabase.from("shorts").select("id, category, quote, tone").eq("published", true).order("position")) as Short[];
export const getDaily = async () => must(await supabase.rpc("get_daily")) as Daily;
export const saveAnswer = async (index: number, body: string) => must(await supabase.rpc("save_answer", { p_idx: index, p_body: body })) as Daily;
export const getAnswers = async () =>
  must(await supabase.from("daily_answers").select("day, idx, question, body").order("day", { ascending: false }).order("idx", { ascending: false }).limit(20)) as MyAnswer[];

export async function setReaction(thoughtId: number, kind: "like" | "save", on: boolean) {
  const table = kind === "like" ? "thought_likes" : "thought_saves";
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("no user");
  const r = on
    ? await supabase.from(table).upsert({ user_id: uid, thought_id: thoughtId })
    : await supabase.from(table).delete().eq("user_id", uid).eq("thought_id", thoughtId);
  if (r.error) throw new Error(r.error.message);
}
