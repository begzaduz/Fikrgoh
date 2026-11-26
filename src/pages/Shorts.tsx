import { useEffect, useRef, useState } from "react";
import { Heart, Send, Volume2, VolumeX } from "lucide-react";
import { AdminMenu } from "../components/AdminMenu";
import { catLabel } from "../components/ThoughtCard";
import { SlideDeck } from "../components/SlideCanvas";
import { proxied, type Short } from "../lib/api";
import { share } from "../lib/tg";
import { useApp } from "../store";

const TONE = {
  sand: "bg-gradient-to-b from-[#3a46a8] to-[#141b52] text-white",
  sage: "bg-gradient-to-b from-[#11877c] to-[#0b2c3b] text-white",
  ink: "bg-gradient-to-b from-[#1a2158] to-[#070a1f] text-white",
  clay: "bg-gradient-to-b from-[#ffc27a] via-[#f0867a] to-[#7a3f8f] text-[#1b1038]",
} as const;

/** Tugmalar fonining rangi: matn rangidan olinadi, shuning uchun ham yorug‘, ham qorong‘i kartada ko‘rinadi. */
const soft = { background: "color-mix(in srgb, currentColor 16%, transparent)" } as const;

const strong = { background: "color-mix(in srgb, currentColor 32%, transparent)" } as const;

function ShortCard({ s }: { s: Short }) {
  const { u, c, canWrite, setComposer, remove, reactShort } = useApp();
  const box = useRef<HTMLElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [direct, setDirect] = useState(false);
  const [errCode, setErrCode] = useState<number | null>(null);
  const visible = useRef(false);
  // Ovozli ijro brauzer tomonidan taqiqlansa, ovozsiz davom etadi (ovoz tugmasi bilan yoqiladi).
  const tryPlay = (v: HTMLVideoElement) => { v.play().catch(() => { if (!v.muted) { v.muted = true; setMuted(true); void v.play().catch(() => {}); } }); };
  // Avval proksi (/sb) orqali, bo‘lmasa to‘g‘ridan-to‘g‘ri havola bilan ochiladi.
  const src = s.video_url ? (direct ? s.video_url : proxied(s.video_url)) : undefined;

  // Faqat ko‘rinib turgan video ijro bo‘ladi (trafik va batareyani tejaydi).
  useEffect(() => {
    const el = box.current;
    const v = vid.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(([e]) => { visible.current = !!e && e.intersectionRatio > 0.6; if (visible.current) tryPlay(v); else v.pause(); }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [s.video_url]);

  // Manba almashganda (proksi → to‘g‘ridan-to‘g‘ri) ko‘rinib turgan video qayta ijro etiladi; muted holati elementga aniq beriladi.
  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    v.muted = muted;
    if (visible.current) tryPlay(v);
  }, [src, muted]);

  const hasSlides = !!s.slides?.length;
  const hasVideo = !hasSlides && !!s.video_url && !failed;
  const btn = "flex h-12 w-12 items-center justify-center rounded-full bg-white/15";
  const soft2 = hasSlides ? { background: "rgba(0,0,0,.4)" } : soft;
  const strong2 = hasSlides ? { background: "rgba(0,0,0,.65)" } : strong;
  const label = (cat: string) => catLabel(cat, u, c);
  return (
    <section ref={box} className={`relative flex h-full snap-start flex-col px-6 pb-8 pt-6 ${hasSlides ? "bg-black text-white" : hasVideo ? "bg-black text-white" : TONE[s.tone]}`}>
      {hasSlides && <SlideDeck slides={s.slides!} c={c} />}
      {hasVideo && (
        <>
          <video ref={vid} src={src} muted={muted} loop playsInline preload="metadata" onError={(e) => { if (direct || src === s.video_url) { setErrCode(e.currentTarget.error?.code ?? null); setFailed(true); } else setDirect(true); }} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" aria-hidden="true" />
        </>
      )}
      <span className="relative text-[12px] font-semibold uppercase tracking-[0.16em] opacity-85">{label(s.category)}</span>
      {s.video_url && failed && <p className="relative mt-2 text-[12px] opacity-80">{u("Video ochilmadi.")}{errCode === 4 ? ` ${u("Format qo‘llab-quvvatlanmaydi (MP4, H.264 kerak).")}` : ""}</p>}

      {/* Matnli kartada matn o‘rtada, videoda pastda (o‘ng tomonda tugmalar uchun joy qoldiriladi). */}
      <div className={`relative flex flex-1 pr-16 ${hasVideo ? "items-end" : "items-center"}`}>
        {!hasSlides && s.quote && <p className={`font-display leading-[1.12] text-balance ${s.quote.length > 140 ? "text-[26px]" : s.quote.length > 70 ? "text-[32px]" : "text-[40px]"}`}>{c(s.quote)}</p>}
      </div>

      <div className="absolute bottom-8 right-4 z-10 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <button className={btn} style={s.liked ? strong2 : soft2} aria-label={u("Yoqtirish")} aria-pressed={s.liked} onClick={() => reactShort(s)}>
            <Heart size={24} fill={s.liked ? "currentColor" : "none"} />
          </button>
          <span className="min-h-[16px] text-[12px] font-semibold opacity-90">{s.likes > 0 ? s.likes : ""}</span>
        </div>
        <button className={btn} style={soft2} aria-label={u("Ulashish")} onClick={() => share(s.quote ? c(s.quote) : "fikrnomiya", s.id)}>
          <Send size={22} />
        </button>
        {hasVideo && (
          <button className={btn} style={soft} aria-label={muted ? u("Ovozni yoqish") : u("Ovozni o‘chirish")} aria-pressed={!muted} onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
        )}
      </div>

      {canWrite && (
        <div className="absolute right-3 top-3 z-10">
          <AdminMenu light onEdit={() => setComposer({ mode: "edit", kind: "short", id: s.id, category: s.category, quote: s.quote, tone: s.tone, video_url: s.video_url, slides: s.slides })} onDelete={() => remove("short", s.id)} />
        </div>
      )}
    </section>
  );
}

/** Qisqa fikrlar: vertikal aylantiriladigan to‘liq ekranli kartalar (matn yoki video). */
export function Shorts() {
  const { shorts, u } = useApp();
  if (!shorts.length) return <p className="p-6 text-sm text-muted">{u("Hozircha qisqa fikrlar yo‘q.")}</p>;
  return (
    <div className="h-full snap-y snap-mandatory overflow-y-auto">
      {shorts.map((s) => <ShortCard key={s.id} s={s} />)}
    </div>
  );
}
