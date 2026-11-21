import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = !!url && !!key;

/**
 * Ishlab chiqarishda so‘rovlar Vercel orqali (o‘z manzilimiz /sb) Supabase'ga uzatiladi (vercel.json: rewrites).
 * Shunda brauzer faqat bitta manzil bilan gaplashadi: CORS va tarmoq cheklovlari muammo bo‘lmaydi.
 */
export const API_URL = import.meta.env.PROD && typeof window !== "undefined" ? `${window.location.origin}/sb` : (url ?? "http://localhost");

export const supabase = createClient(API_URL, key ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true },
});
