import { API_URL, supabase } from "./supabase";
import { tg, tgUserId } from "./tg";

export type Category = "fikr" | "mindset" | "madaniyat";
export type Thought = { id: number; category: Category; title: string; body: string; read_minutes: number; created_at: string; likes: number; liked: boolean; saved: boolean };
export type Short = { id: number; category: Category; quote: string; tone: "sand" | "sage" | "ink" | "clay"; video_url: string | null };
export type Daily = {
  day: string;
  questions: Array<{ index: number; text: string; answer: string | null }>;
  done: number; streak: number; points: number; level: 0 | 1 | 2; levelFrom: number; levelTo: number;
};
export type MyAnswer = { day: string; idx: number; question: string; body: string };
export type Stats = { reads: number; categories: number; streak: number; today: boolean; week: boolean[]; todayIndex: number; level: 0 | 1 | 2; levelTo: number | null };
export type Profile = { id: string; first_name: string; username: string | null; role: "reader" | "admin"; alphabet: "new" | "old" };

const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error || r.data === null) throw new Error(r.error?.message ?? "no data");
  return r.data;
};

/** Telegram initData bilan kiradi (sinov rejimida: DEV_AUTH yoqilgan bo‘lsa, dev foydalanuvchi bilan). */
export async function login(): Promise<{ ok: boolean; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const initData = tg()?.initData;
  if (data.session) {
    // Telegram bir qurilmada bir necha akkaunt uchun bir xil saqlash joyini beradi: sessiya hozir ochayotgan akkauntniki bo‘lishi shart.
    const want = initData ? tgUserId(initData) : null;
    const have = Number(data.session.user?.user_metadata?.telegram_id) || null;
    if (want === null || want === have) return { ok: true };
    await supabase.auth.signOut({ scope: "local" });
  }
  const body = initData ? { initData } : import.meta.env.DEV ? { dev: { telegramId: 100001, firstName: "Bekzod" } } : null;
  if (!body) return { ok: false, error: "Telegram ma’lumoti (initData) kelmadi" };
  // Oddiy fetch: faqat funksiya ruxsat bergan sarlavhalar (content-type, apikey, authorization) yuboriladi.
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/functions/v1/swift-processor`, {
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
/** video_url ustuni (0002_media.sql) hali yaratilmagan bo‘lsa ham ro‘yxat ishlashi uchun zaxira so‘rov. */
export const getShorts = async (): Promise<Short[]> => {
  const full = await supabase.from("shorts").select("id, category, quote, tone, video_url").eq("published", true).order("position");
  if (!full.error) return (full.data ?? []) as Short[];
  const basic = await supabase.from("shorts").select("id, category, quote, tone").eq("published", true).order("position");
  if (basic.error) throw new Error(basic.error.message);
  return (basic.data ?? []).map((x) => ({ ...x, video_url: null })) as Short[];
};
export const getDaily = async () => must(await supabase.rpc("get_daily")) as Daily;
export const saveAnswer = async (index: number, body: string) => must(await supabase.rpc("save_answer", { p_idx: index, p_body: body })) as Daily;
export const getAnswers = async () =>
  must(await supabase.from("daily_answers").select("day, idx, question, body").order("day", { ascending: false }).order("idx", { ascending: false }).limit(20)) as MyAnswer[];

export const getStats = async () => must(await supabase.rpc("get_stats")) as Stats;
export async function recordRead(thoughtId: number) {
  const r = await supabase.rpc("record_read", { p_thought_id: thoughtId });
  if (r.error) throw new Error(r.error.message);
}

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

/* ---------- Admin: joylash, tahrirlash, o‘chirish, video yuklash (RLS faqat adminga ruxsat beradi) ---------- */
const minutes = (body: string) => Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 180));
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export async function createThought(authorId: string, p: { category: Category; title: string; body: string }) {
  fail((await supabase.from("thoughts").insert({ author_id: authorId, category: p.category, title: p.title, body: p.body, read_minutes: minutes(p.body) })).error);
}
export async function updateThought(id: number, p: { category: Category; title: string; body: string }) {
  const r = await supabase.from("thoughts").update({ category: p.category, title: p.title, body: p.body, read_minutes: minutes(p.body) }).eq("id", id).select("id");
  fail(r.error);
  if (!r.data?.length) throw new Error("topilmadi yoki ruxsat yo‘q");
}
export async function deleteThought(id: number) {
  const r = await supabase.from("thoughts").delete().eq("id", id).select("id");
  fail(r.error);
  if (!r.data?.length) throw new Error("topilmadi yoki ruxsat yo‘q");
}

type ShortInput = { category: Category; quote: string; tone: Short["tone"]; video_url: string | null };
export async function createShort(p: ShortInput) {
  // Yangisi birinchi chiqishi uchun salbiy tartib raqami (ro‘yxat position bo‘yicha o‘sish tartibida).
  fail((await supabase.from("shorts").insert({ ...p, position: -Math.floor(Date.now() / 1000) })).error);
}
export async function updateShort(id: number, p: ShortInput) {
  const r = await supabase.from("shorts").update(p).eq("id", id).select("id");
  fail(r.error);
  if (!r.data?.length) throw new Error("topilmadi yoki ruxsat yo‘q");
}
export async function deleteShort(id: number) {
  const r = await supabase.from("shorts").delete().eq("id", id).select("id");
  fail(r.error);
  if (!r.data?.length) throw new Error("topilmadi yoki ruxsat yo‘q");
}

export const BUCKET = "shorts-media";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // Supabase bepul tarifidagi bitta fayl chegarasi
const DIRECT = import.meta.env.VITE_SUPABASE_URL as string;

/** Bazada saqlangan to‘g‘ridan-to‘g‘ri video havolasini o‘z proksimiz (/sb) orqali ochiladigan havolaga o‘giradi (supabase.co yopiq tarmoqlar uchun zaxira). */
export const proxied = (url: string) => (DIRECT && url.startsWith(DIRECT) ? API_URL + url.slice(DIRECT.length) : url);

/** Videoni Storage'ga yuklaydi (foiz bilan). Avval to‘g‘ridan-to‘g‘ri, tarmoq xatosi bo‘lsa Vercel proksi orqali. Ochiq havolani qaytaradi. */
export async function uploadVideo(file: File, onProgress: (pct: number) => void): Promise<string> {
  const ext = file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4";
  const path = `${crypto.randomUUID()}.${ext}`;
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("kirish kerak");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const send = (base: string) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${base}/storage/v1/object/${BUCKET}/${path}`);
      xhr.setRequestHeader("apikey", key);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}: ${xhr.responseText.slice(0, 120)}`)));
      xhr.onerror = () => reject(Object.assign(new Error("tarmoq xatosi"), { network: true }));
      xhr.send(file);
    });

  try {
    await send(DIRECT);
  } catch (e) {
    if (!(e as { network?: boolean }).network) throw e;
    await send(API_URL);
  }
  return `${DIRECT}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Eski/o‘chirilgan video faylini Storage'dan olib tashlaydi (xato bo‘lsa e’tibor bermaydi). */
export async function removeVideo(url: string | null) {
  const path = url?.split(`/${BUCKET}/`)[1];
  if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
