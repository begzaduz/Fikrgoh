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
let bigFeed = false; // sahifalash testi uchun: birinchi sahifa 30 ta, keyingisi 1 ta
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
    if (url.includes("/rpc/feed")) {
      if (!bigFeed) return json(FEED);
      const b = init?.body ? JSON.parse(init.body) : {};
      return json(b.p_offset ? [{ ...FEED[0], id: 101, title: "Eski fikr" }] : Array.from({ length: 30 }, (_, i) => ({ ...FEED[0], id: i + 1, title: `Fikr ${i + 1}` })));
    }
    if (url.includes("/rest/v1/thought_reads")) return json([{ day: "2026-11-20", thought_id: 1, thoughts: { title: "Töğri savol" } }]);
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


/** Intro (faqat logo) o‘zi ochiladi: animatsiyasiz rejim stub qilinadi, ma’lumot yuklangach intro yo‘qoladi. */
async function boot(ui: React.ReactElement) {
  window.matchMedia = ((q: string) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
  render(ui);
  await waitFor(() => expect(document.querySelector("[data-intro]")).toBeNull(), { timeout: 4000 });
}

describe("Fikrnoma", () => {
  it("Telegram ichida kiradi va lentani ko‘rsatadi (kunlik savollarsiz)", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    await boot(<AppProvider><App /></AppProvider>);

    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });
    expect(screen.getByText("Töğri savol")).toBeTruthy();                       // fikrlar lentasi
    expect(calls.some((c) => c.startsWith("POST /functions/v1/swift-processor"))).toBe(true);

    expect(screen.queryByText(/Bugungi 5 savol|Bo[sş]la[sş]/)).toBeNull();      // kunlik savollar olib tashlangan
    expect(calls.some((c) => c.includes("/rpc/get_daily"))).toBe(false);
  });

  it("lenta 30 tadan ko‘p bo‘lsa, \"Yana ko‘rsatish\" keyingi sahifani yuklaydi", async () => {
    bigFeed = true;
    try {
      const { AppProvider } = await import("../src/store");
      const { default: App } = await import("../src/App");
      render(<AppProvider><App /></AppProvider>);
      await waitFor(() => expect(screen.getByText("Fikr 1")).toBeTruthy(), { timeout: 4000 });
      expect(screen.queryByText("Eski fikr")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /Yana k[oö]/ }));
      await waitFor(() => expect(screen.getByText("Eski fikr")).toBeTruthy());
      expect(calls.some((c) => c.includes("/rpc/feed"))).toBe(true);
      expect(screen.queryByRole("button", { name: /Yana k[oö]/ })).toBeNull(); // 1 ta keldi: boshqa sahifa yo‘q
    } finally {
      bigFeed = false;
    }
  });

  it("admin eski alifboda yozadi, matn yangi alifboda joylanadi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    await boot(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: "Yangi fikr" }));
    fireEvent.change(await screen.findByLabelText("Mavzu"), { target: { value: "Sport" } });
    fireEvent.change(await screen.findByLabelText("Sarlavha"), { target: { value: "To‘g‘ri savol" } });
    fireEvent.change(screen.getByLabelText("Matn"), { target: { value: "Shoshilinch fikr: bu yigirma belgidan ko‘p matn." } });
    fireEvent.click(screen.getByRole("button", { name: /Joyla[sş]/ }));

    await waitFor(() => expect(writes.some((w) => w.url.startsWith("POST") && w.url.includes("/rest/v1/thoughts"))).toBe(true));
    const w = writes.find((x) => x.url.startsWith("POST") && x.url.includes("/rest/v1/thoughts"))!;
    expect(w.body.title).toBe("Töğri savol");
    expect(w.body.body).toBe("Şoşilinç fikr: bu yigirma belgidan köp matn.");
    expect(w.body.category).toBe("sport");
    expect(w.body.author_id).toBe("u1");
  });

  it("admin fikrni tahrirlaydi va o‘chiradi (tasdiqlash bilan)", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    await boot(<AppProvider><App /></AppProvider>);
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
    await boot(<AppProvider><App /></AppProvider>);
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
    await boot(<AppProvider><App /></AppProvider>);
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
    await boot(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });
    const after = calls.filter((c) => c.startsWith("POST /functions/v1/swift-processor")).length;
    expect(after).toBe(before + 1);
  });

  it("fikr ochilganda o‘qilgani yoziladi, profilda ko‘rsatkichlar chiqadi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    await boot(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    fireEvent.click(screen.getByText("Töğri savol"));
    await waitFor(() => expect(calls.some((c) => c.includes("/rpc/record_read"))).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Profil" }));
    await waitFor(() => expect(screen.getByText("Haftalik iz")).toBeTruthy());
    expect(screen.getByText(/^Kuzatuv[cç]i$/)).toBeTruthy();
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
    await boot(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    // Rejim tanlovi Profilda (sarlavhada endi faqat logo va qidiruv)
    fireEvent.click(screen.getByRole("button", { name: "Profil" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tungi" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("fikrnoma-theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Kunduzgi" }));
    expect(document.documentElement.dataset.theme).toBe("light");

    // Profildagi "Avto" tanlovi qo‘lda tanlovni bekor qiladi
    fireEvent.click(await screen.findByRole("button", { name: "Avto" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    localStorage.removeItem("fikrnoma-theme");
  });

  it("Shorts: yoqtirish va ulashish tugmalari ishlaydi", async () => {
    const open = vi.fn();
    (window as any).Telegram.WebApp.openTelegramLink = open;
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    await boot(<AppProvider><App /></AppProvider>);
    await waitFor(() => expect(screen.getByText("Töğri savol")).toBeTruthy(), { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: "Shorts" }));
    const like = await screen.findByRole("button", { name: /Yoqtiri[sş]/ });
    expect(like.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(like);
    await waitFor(() => expect(screen.getByRole("button", { name: /Yoqtiri[sş]/ }).getAttribute("aria-pressed")).toBe("true"));
    await waitFor(() => expect(writes.some((w) => w.url.startsWith("POST") && w.url.includes("/rest/v1/short_likes"))).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: /Ula[sş]i[sş]/ }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toContain("https://t.me/share/url?url=");
    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain("t.me/fikrnomabot");
  });

  it("kirish ekrani: faqat logo (matn va tugmasiz), ma'lumot yuklangach o'zi ochiladi", async () => {
    const { AppProvider } = await import("../src/store");
    const { default: App } = await import("../src/App");
    render(<AppProvider><App /></AppProvider>);
    expect(screen.getByRole("img", { name: "fikrgoh" })).toBeTruthy();
    expect(screen.queryByText("Axborot emas.")).toBeNull();
    expect(screen.queryByRole("button", { name: /Kiri[sş]/ })).toBeNull();      // tugma yo'q
    expect(document.querySelector("[inert]")).not.toBeNull();                    // intro ochiq: orqadagi ilova bosilmaydi
    await waitFor(() => expect(document.querySelector("[data-intro]")).toBeNull(), { timeout: 4000 });
    expect(document.querySelector("[inert]")).toBeNull();
    expect(screen.getByRole("button", { name: "Profil" })).toBeTruthy();
    const wrap = screen.getByRole("button", { name: "Profil" }).closest("div.h-full") as HTMLElement;
    await waitFor(() => expect(["", "none"]).toContain(wrap.style.transform));   // fixed oynalar buzilmasligi uchun transform qolmasin
  });
});
