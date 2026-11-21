import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { AdminMenu } from "../components/AdminMenu";
import { CATEGORY_LABEL } from "../components/ThoughtCard";
import type { Short } from "../lib/api";
import { useApp } from "../store";

const TONE = {
  sand: "bg-[#e8dec9] text-[#211c17]",
  sage: "bg-[#5f6f55] text-[#f3ecdd]",
  ink: "bg-[#211c17] text-[#f3ecdd]",
  clay: "bg-[#a2461f] text-[#f3ecdd]",
} as const;

function ShortCard({ s }: { s: Short }) {
  const { u, c, canWrite, setComposer, remove } = useApp();
  const box = useRef<HTMLElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  // Faqat ko‘rinib turgan video ijro bo‘ladi (trafik va batareyani tejaydi).
  useEffect(() => {
    const el = box.current;
    const v = vid.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(([e]) => { if (e && e.intersectionRatio > 0.6) void v.play().catch(() => {}); else v.pause(); }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [s.video_url]);

  const hasVideo = !!s.video_url && !failed;
  return (
    <section ref={box} className={`relative flex h-full snap-start flex-col justify-end gap-3 p-7 ${hasVideo ? "bg-black text-white" : TONE[s.tone]}`}>
      {hasVideo && (
        <>
          <video ref={vid} src={s.video_url!} muted={muted} loop playsInline preload="metadata" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" aria-hidden="true" />
        </>
      )}
      {s.video_url && failed && <p className="relative text-[12px] opacity-80">{u("Video ochilmadi.")}</p>}
      <div className="relative flex items-start justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[2px] opacity-90">{u(CATEGORY_LABEL[s.category])}</span>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        {s.quote && <p className="font-serif text-[26px] font-semibold leading-snug">{c(s.quote)}</p>}
        {hasVideo && (
          <button aria-label={muted ? u("Ovozni yoqish") : u("Ovozni o‘chirish")} aria-pressed={!muted} onClick={() => setMuted((m) => !m)}
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/40 text-white">
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        )}
      </div>
      {canWrite && (
        <div className="absolute right-3 top-3 z-10">
          <AdminMenu light onEdit={() => setComposer({ mode: "edit", kind: "short", id: s.id, category: s.category, quote: s.quote, tone: s.tone, video_url: s.video_url })} onDelete={() => remove("short", s.id)} />
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
