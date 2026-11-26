import { createClient } from "jsr:@supabase/supabase-js@2";
import { LAYOUTS, MAX_CHARS, MAX_SLIDES, MAX_UNITS, build, fallbackPlan, splitUnits, validPlan } from "./logic.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPT = `Sen faqat dizayn muharririsan. Senga raqamlangan jumlalar beriladi. Matnni O‘ZGARTIRMA, yangi so‘z QO‘SHMA, hech narsani tushirib qoldirma.
Vazifang: ketma-ket jumlalarni slaydlarga guruhlash (har slaydda 1-3 jumla, jami eng ko‘pi ${MAX_SLIDES} slayd) va har slayd uchun dizayn tanlash.
Qoidalar:
- Slaydlar jumlalarni TARTIB bilan, oraliq tashlamasdan, takrorlamasdan qoplashi shart: birinchi slayd from=0 dan boshlanadi, keyingisining from'i oldingisining to+1'i, oxirgisi eng oxirgi jumlada tugaydi.
- Mazmunan yaqin jumlalarni bitta slaydga qo‘y. Qisqa, kuchli jumla alohida slaydga yarashadi.
- bg: 0 indigo, 1 firuza, 2 tun ko‘k, 3 tong (iliq), 4 och ko‘k, 5 qog‘oz, 6 qora. Kayfiyatga mos tanla, ketma-ket slaydlarda bir xil rangni takrorlayvermasdan, lekin uyg‘un bo‘lsin.
- layout: "quote" (iqtibos/aforizm), "big" (juda qisqa bitta ibora, 70 belgigacha), "plain" (oddiy matn), "title_body" (birinchi jumla sarlavha, qolgani matn; kamida 2 jumla).
Faqat JSON qaytar.`;

async function askGemini(key: string, units: string[]) {
  const model = (Deno.env.get("GEMINI_MODEL") ?? "").trim().replace(/^models\//, "") || "gemini-2.5-flash";
  const numbered = units.map((u, i) => `${i}: ${u}`).join("\n");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: "user", parts: [{ text: numbered }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { slides: { type: "ARRAY", items: { type: "OBJECT",
            properties: { from: { type: "INTEGER" }, to: { type: "INTEGER" }, bg: { type: "INTEGER" }, layout: { type: "STRING", enum: [...LAYOUTS] } },
            required: ["from", "to", "bg", "layout"] } } },
          required: ["slides"],
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} [${model}] ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "null");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  });
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return json({ error: "kirish kerak" }, 401);
  const { data: prof } = await sb.from("profiles").select("role").single();
  if (prof?.role !== "admin") return json({ error: "ruxsat yo‘q" }, 403);

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 10) return json({ error: "Matn juda qisqa" }, 400);
  if (text.length > MAX_CHARS) return json({ error: `Matn juda uzun (${MAX_CHARS} belgigacha)` }, 400);
  const units = splitUnits(text);
  if (units.length > MAX_UNITS) return json({ error: "Jumlalar juda ko‘p" }, 400);

  const key = (Deno.env.get("GEMINI_API") ?? Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("gemini_api") ?? "").trim();
  let plan = null, ai = false, note = "";
  if (key && units.length > 1) {
    try { plan = validPlan(await askGemini(key, units), units.length); ai = !!plan; if (!plan) note = "AI javobi yaroqsiz, qoida asosida bo‘lindi"; }
    catch (e) { note = `AI ishlamadi (${e instanceof Error ? e.message : "xato"}), qoida asosida bo‘lindi`; }
  } else if (!key) note = "AI kaliti topilmadi, qoida asosida bo‘lindi";
  return json({ slides: build(units, plan ?? fallbackPlan(units)), ai, note });
});
