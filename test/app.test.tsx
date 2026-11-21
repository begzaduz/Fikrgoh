// @vitest-environment jsdom
// Frontend + kirish jarayoni: soxta Telegram va soxta Supabase javoblari bilan.
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s1" })}.sig`;
const USER = { id: "u1", aud: "authenticated", role: "authenticated", email: "tg1@x", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" };
const DAILY = { day: "2026-11-21", done: 0, streak: 0, points: 0, level: 0, levelFrom: 0, levelTo: 100,
  questions: [0, 1, 2, 3, 4].map((i) => ({ index: i, text: `Savol ${i}?`, answer: null })) };
const FEED = [{ id: 1, category: "fikr", title: "Töğri savol", body: "Matn", read_minutes: 1, created_at: "2026-11-21", likes: 2, liked: false, saved: false }];
const calls: string[] = [];
const writes: Array<{ url: string; body: any }> = [];
afterEach(cleanup);
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

beforeAll(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_publishable_test");
  (window as any).Telegram = { WebApp: { initData: "auth_date=1&hash=abc&user=%7B%7D", ready() {}, expand() {} } };
  window.fetch = vi.fn(async (input: any, init?: any) => {
    const url = String(input?.url ?? input);
    calls.push(`${init?.method ?? "GET"} ${url.replace("https://x.supabase.co", "")}`);
    if (init?.method === "POST" && url.includes("/rest/v1/") && init.body) writes.push({ url, body: JSON.parse(init.body) });
    if (url.includes("/functions/v1/swift-processor")) return json({ access_token: jwt, refresh_token: "r" });
    if (url.includes("/auth/v1/user")) return json(USER);
    if (url.includes("/rpc/feed")) return json(FEED);
    if (url.includes("/rpc/get_daily")) return json(DAILY);
    if (url.includes("/rpc/save_answer")) {
      const idx = JSON.parse(init.body).p_idx;
      return json({ ...DAILY, done: 1, streak: 1, points: 10, questions: DAILY.questions.map((q) => (q.index === idx ? { ...q, answer: "Javob" } : q)) });
    }
    if (url.includes("/rest/v1/profiles")) return json({ id: "u1", first_name: "Bekzod", username: "bek", role: "admin", alphabet: "new" });
    if (url.includes("/rest/v1/shorts")) return json([{ id: 1, category: "fikr", quote: "Qisqa", tone: "sand" }]);
    if (url.includes("/rest/v1/daily_answers")) return json([]);
    return json([]);
  }) as any;
});

describe("Fikrnoma", () => {
  it("Telegram ichida kiradi, lentani va kunlik savollarni ko‘rsatadi, javob saqlaydi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);

    await waitFor(() => expect(screen.getByText("Bugungi 5 savol")).toBeTruthy(), { timeout: 4000 });
    expect(screen.getByText("Töğri savol")).toBeTruthy();                       // fikrlar lentasi
    expect(calls.some((c) => c.startsWith("POST /functions/v1/swift-processor"))).toBe(true);

    fireEvent.click(screen.getByText(/Bo[sş]la[sş]/)); // "Boshlash" → yangi alifboda
    await waitFor(() => expect(screen.getByLabelText(/Javobingiz/)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Javobingiz/), { target: { value: "Javob" } });
    fireEvent.click(screen.getByRole("button", { name: /Javobni saqla[sş]/ }));
    await waitFor(() => expect(calls.some((c) => c.includes("/rpc/save_answer"))).toBe(true));
  });

  it("admin eski alifboda yozadi, matn yangi alifboda joylanadi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Bugungi 5 savol")).toBeTruthy(), { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: "Yangi fikr" }));
    fireEvent.change(await screen.findByLabelText("Sarlavha"), { target: { value: "To‘g‘ri savol" } });
    fireEvent.change(screen.getByLabelText("Matn"), { target: { value: "Shoshilinch fikr: bu yigirma belgidan ko‘p matn." } });
    fireEvent.click(screen.getByRole("button", { name: /Joyla[sş]/ }));

    await waitFor(() => expect(writes.some((w) => w.url.includes("/rest/v1/thoughts"))).toBe(true));
    const w = writes.find((x) => x.url.includes("/rest/v1/thoughts"))!;
    expect(w.body.title).toBe("Töğri savol");
    expect(w.body.body).toBe("Şoşilinç fikr: bu yigirma belgidan köp matn.");
    expect(w.body.category).toBe("fikr");
    expect(w.body.author_id).toBe("u1");
  });
});
