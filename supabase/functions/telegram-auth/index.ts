// Telegram Mini App initData'sini tekshirib, Supabase sessiyasini qaytaradi.
// Maxfiy kalitlar (Supabase → Edge Functions → Secrets): TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_IDS (vergul bilan), DEV_AUTH (faqat sinov uchun "true").
// SUPABASE_URL, SUPABASE_ANON_KEY va SUPABASE_SERVICE_ROLE_KEY Supabase tomonidan avtomatik beriladi.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function hmac(key: ArrayBuffer | string, msg: string) {
  const k = await crypto.subtle.importKey("raw", typeof key === "string" ? enc.encode(key) : key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
const safeEqual = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

type TgUser = { id: number; first_name: string; username?: string };

async function verifyInitData(initData: string, botToken: string): Promise<TgUser | null> {
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmac("WebAppData", botToken);
  if (!safeEqual(hex(await hmac(secret, dcs)), hash)) return null;
  const age = Date.now() / 1000 - Number(p.get("auth_date") ?? 0);
  if (!(age >= 0 && age < 86400)) return null; // 24 soatdan eski initData qabul qilinmaydi
  try {
    const u = JSON.parse(p.get("user") ?? "");
    return typeof u?.id === "number" && u.first_name ? (u as TgUser) : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const adminIds = (Deno.env.get("ADMIN_TELEGRAM_IDS") ?? "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const body = await req.json().catch(() => ({}));

  let user: TgUser | null = null;
  if (typeof body.initData === "string" && botToken) user = await verifyInitData(body.initData, botToken);
  else if (Deno.env.get("DEV_AUTH") === "true" && body.dev?.telegramId) {
    user = { id: Number(body.dev.telegramId), first_name: String(body.dev.firstName ?? "Sinov") };
  }
  if (!user) return json({ error: "Telegram ma’lumoti tasdiqlanmadi" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });

  // Har bir Telegram foydalanuvchisi uchun barqaror email va bot tokenidan olingan parol (hech qayerda saqlanmaydi).
  const email = `tg${user.id}@users.fikrnoma.app`;
  const password = hex(await hmac(botToken || "dev", `pw:${user.id}`));

  let { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { telegram_id: user.id } });
    if (created.error && !/already|registered/i.test(created.error.message)) return json({ error: "Hisob yaratib bo‘lmadi" }, 500);
    ({ data, error } = await anon.auth.signInWithPassword({ email, password }));
    if (error || !data.session) return json({ error: "Kirish amalga oshmadi" }, 500);
  }

  const uid = data.user!.id;
  const { error: pe } = await admin.from("profiles").upsert(
    { id: uid, telegram_id: user.id, first_name: user.first_name, username: user.username ?? null, ...(adminIds.includes(user.id) ? { role: "admin" } : {}) },
    { onConflict: "id" },
  );
  if (pe) return json({ error: "Profil saqlanmadi" }, 500);

  return json({ access_token: data.session!.access_token, refresh_token: data.session!.refresh_token });
});
