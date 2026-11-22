// @vitest-environment jsdom
// Frontend + kirish jarayoni: soxta Telegram va soxta Supabase javoblari bilan.
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup, within } from "@testing-library/react";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s1" })}.sig`;
const USER = { id: "u1", aud: "authenticated", role: "authenticated", email: "tg1@x", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" };
const DAILY = { day: "2026-11-21", done: 0, streak: 0, points: 0, level: 0, levelFrom: 0, levelTo: 100,
  questions: [0, 1, 2, 3, 4].map((i) => ({ index: i, text: `Savol ${i}?`, answer: null })) };
const FEED = [{ id: 1, category: "fikr", title: "Töğri savol", body: "Matn matn matn matn matn matn matn", read_minutes: 1, created_at: "2026-11-21", likes: 2, liked: false, saved: false }];
const STATS = { reads: 2, categories: 1, streak: 3, today: true, week: [false, false, true, true, true, false, false], todayIndex: 4, level: 0, levelTo: 5 };
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
    const m = init?.method as string | undefined;
    if ((m === "POST" || m === "PATCH" || m === "DELETE") && url.includes("/rest/v1/")) writes.push({ url: `${m} ${url}`, body: init.body ? JSON.parse(init.body) : null });
    if ((m === "PATCH" || m === "DELETE") && url.includes("/rest/v1/")) return json([{ id: 1 }]);
    if (url.includes("/functions/v1/swift-processor")) return json({ access_token: jwt, refresh_token: "r" });
    if (url.includes("/auth/v1/user")) return json(USER);
    if (url.includes("/rpc/feed")) return json(FEED);
    if (url.includes("/rpc/get_stats")) return json(STATS);
    if (url.includes("/rpc/record_read")) return json(null, 204);
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
  it("Telegram ichida kiradi va lentani ko‘rsatadi (kunlik savollarsiz)", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);

    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });
    expect(screen.getByText("Töğri savol")).toBeTruthy();                       // fikrlar lentasi
    expect(calls.some((c) => c.startsWith("POST /functions/v1/swift-processor"))).toBe(true);

    expect(screen.queryByText(/Bugungi 5 savol|Bo[sş]la[sş]/)).toBeNull();      // kunlik savollar olib tashlangan
    expect(calls.some((c) => c.includes("/rpc/get_daily"))).toBe(false);
  });

  it("admin eski alifboda yozadi, matn yangi alifboda joylanadi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: "Yangi fikr" }));
    fireEvent.change(await screen.findByLabelText("Sarlavha"), { target: { value: "To‘g‘ri savol" } });
    fireEvent.change(screen.getByLabelText("Matn"), { target: { value: "Shoshilinch fikr: bu yigirma belgidan ko‘p matn." } });
    fireEvent.click(screen.getByRole("button", { name: /Joyla[sş]/ }));

    await waitFor(() => expect(writes.some((w) => w.url.startsWith("POST") && w.url.includes("/rest/v1/thoughts"))).toBe(true));
    const w = writes.find((x) => x.url.startsWith("POST") && x.url.includes("/rest/v1/thoughts"))!;
    expect(w.body.title).toBe("Töğri savol");
    expect(w.body.body).toBe("Şoşilinç fikr: bu yigirma belgidan köp matn.");
    expect(w.body.category).toBe("fikr");
    expect(w.body.author_id).toBe("u1");
  });

  it("admin fikrni tahrirlaydi va o‘chiradi (tasdiqlash bilan)", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    // Tahrirlash
    fireEvent.click(screen.getByRole("button", { name: "Amallar" }));
    fireEvent.click(screen.getByRole("button", { name: /Tahrirla[sş]/ }));
    const title = (await screen.findByLabelText("Sarlavha")) as HTMLInputElement;
    expect(title.value).toBe("Töğri savol");                       // mavjud matn yangi alifboda to‘ldirilgan
    fireEvent.change(title, { target: { value: "Yangi sarlavha" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Saqla[sş]$/ }));
    await waitFor(() => expect(writes.some((w) => w.url.startsWith("PATCH") && w.url.includes("id=eq.1"))).toBe(true));
    expect(writes.find((w) => w.url.startsWith("PATCH"))!.body.title).toBe("Yangi sarlavha");
    await waitFor(() => expect(screen.queryByLabelText("Sarlavha")).toBeNull());

    // O‘chirish: tasdiqlanmaguncha so‘rov yuborilmaydi
    fireEvent.click(screen.getByRole("button", { name: "Amallar" }));
    fireEvent.click(screen.getByRole("button", { name: /Ö[çc]iri[sş]/ }));
    expect(writes.some((w) => w.url.startsWith("DELETE"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Ha, ö[çc]iri[sş]/ }));
    await waitFor(() => expect(writes.some((w) => w.url.startsWith("DELETE") && w.url.includes("id=eq.1"))).toBe(true));
  });

  it("video: juda katta yoki video bo‘lmagan fayl rad etiladi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: "Yangi fikr" }));
    fireEvent.click(await screen.findByRole("button", { name: "Short" }));

    const input = screen.getByLabelText(/Video tanla[sş]/) as HTMLInputElement;
    const big = new File(["x"], "katta.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 60 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [big] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/juda katta/);

    fireEvent.change(input, { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Faqat video/));
  });
  // jsdom videoni yuklamaydi: src berilganda tanlangan hodisani o‘zimiz yuboramiz.
  const stubMedia = (event: "error" | "loadeddata", width: number) => {
    const srcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
    const widthDesc = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, "videoWidth");
    const cu = URL.createObjectURL, ru = URL.revokeObjectURL;
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      configurable: true,
      get: () => "",
      set(this: HTMLMediaElement) { setTimeout(() => this.dispatchEvent(new Event(event)), 0); },
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => width });
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    return () => {
      if (srcDesc) Object.defineProperty(HTMLMediaElement.prototype, "src", srcDesc);
      if (widthDesc) Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", widthDesc);
      URL.createObjectURL = cu;
      URL.revokeObjectURL = ru;
    };
  };
  const openShortComposer = async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: "Yangi fikr" }));
    fireEvent.click(await screen.findByRole("button", { name: "Short" }));
    return screen.getByLabelText(/Video tanla[sş]/) as HTMLInputElement;
  };

  it("video: kodek ochilmasa (brauzer xato bersa) rad etiladi", async () => {
    const restore = stubMedia("error", 0);
    try {
      const input = await openShortComposer();
      fireEvent.change(input, { target: { files: [new File(["x"], "hevc.mp4", { type: "video/mp4" })] } });
      await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/kodek/), { timeout: 3000 });
      expect(screen.queryByText(/hevc\.mp4/)).toBeNull();
    } finally { restore(); }
  });

  it("video: faqat ovoz ochilsa (tasvir kengligi 0) rad etiladi", async () => {
    const restore = stubMedia("loadeddata", 0);
    try {
      const input = await openShortComposer();
      fireEvent.change(input, { target: { files: [new File(["x"], "audio-only.mp4", { type: "video/mp4" })] } });
      await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/kodek/), { timeout: 3000 });
    } finally { restore(); }
  });

  it("video: ochiladigan video qabul qilinadi", async () => {
    const restore = stubMedia("loadeddata", 720);
    try {
      const input = await openShortComposer();
      fireEvent.change(input, { target: { files: [new File(["x"], "yaxshi.mp4", { type: "video/mp4" })] } });
      expect(await screen.findByText(/yaxshi\.mp4/, undefined, { timeout: 3000 })).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();
    } finally { restore(); }
  });
  it("boshqa Telegram akkaunt ochilganda eski sessiya ishlatilmaydi (qayta kiriladi)", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    const before = calls.filter((c) => c.startsWith("POST /functions/v1/swift-processor")).length;
    (window as any).Telegram.WebApp.initData = `auth_date=1&hash=abc&user=${encodeURIComponent(JSON.stringify({ id: 555, first_name: "Boshqa" }))}`;
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });
    const after = calls.filter((c) => c.startsWith("POST /functions/v1/swift-processor")).length;
    expect(after).toBe(before + 1);
  });

  it("fikr ochilganda o‘qilgani yoziladi, profilda ko‘rsatkichlar chiqadi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    fireEvent.click(screen.getByText("Töğri savol"));
    await waitFor(() => expect(calls.some((c) => c.includes("/rpc/record_read"))).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Profil" }));
    await waitFor(() => expect(screen.getByText("Haftalik iz")).toBeTruthy());
    expect(screen.getByText(/Unvon: Kuzatuv[cç]i/)).toBeTruthy();
    expect(screen.getByText("Belgilar")).toBeTruthy();
    expect(screen.getByText("Ketma-ket kun")).toBeTruthy();
    expect(screen.getByText(/Birin[cç]i sahifa/)).toBeTruthy();
    expect(screen.getByText(/Mulohaza[cç]i unvoniga yana 3 ta fikr qoldi/)).toBeTruthy();
    expect(screen.getByText("Ç")).toBeTruthy(); // hafta kuni: Chorshanba (yangi alifboda)
  });

  it("tungi/kunduzgi rejim almashadi va saqlanadi", async () => {
    localStorage.removeItem("fikrnoma-theme");
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: "Tungi rejim" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("fikrnoma-theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Kunduzgi rejim" }));
    expect(document.documentElement.dataset.theme).toBe("light");

    // Profildagi "Avto" tanlovi qo‘lda tanlovni bekor qiladi
    fireEvent.click(screen.getByRole("button", { name: "Profil" }));
    fireEvent.click(await screen.findByRole("button", { name: "Avto" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    localStorage.removeItem("fikrnoma-theme");
  });
});
