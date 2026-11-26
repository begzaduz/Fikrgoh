import { useRef } from "react";
import type { El, Slide } from "../lib/slides";

const FONT = { display: "font-display", serif: "font-serif", sans: "font-sans" } as const;

type Props = {
  slide: Slide;
  c: (s: string) => string;
  /** true bo‘lsa ota-elementni to‘ldiradi (o‘quvchi), aks holda 9:16 nisbatda (muharrir). */
  fill?: boolean;
  sel?: string | null;
  onSel?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
};

/** Bitta slaydni chizadi. Matn o‘lchami tuval kengligiga nisbatan (cqw), shuning uchun har qanday ekranda bir xil ko‘rinadi. */
export function SlideCanvas({ slide, c, fill, sel, onSel, onMove }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const edit = !!onMove;

  const drag = (e: React.PointerEvent, el: El) => {
    if (!edit) return;
    e.stopPropagation();
    onSel?.(el.id);
    const r = box.current!.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y;
    const t = e.currentTarget as HTMLElement;
    t.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => onMove!(el.id, Math.round((ox + ((ev.clientX - sx) / r.width) * 100) * 10) / 10, Math.round((oy + ((ev.clientY - sy) / r.height) * 100) * 10) / 10);
    const up = () => { t.removeEventListener("pointermove", move); t.removeEventListener("pointerup", up); t.removeEventListener("pointercancel", up); };
    t.addEventListener("pointermove", move);
    t.addEventListener("pointerup", up);
    t.addEventListener("pointercancel", up);
  };

  return (
    <div ref={box} onPointerDown={() => onSel?.(null)}
      className={`relative overflow-hidden ${fill ? "absolute inset-0" : "aspect-[9/16] w-full rounded-2xl"}`}
      style={{ containerType: "inline-size", background: slide.bg.css }}>
      {slide.bg.image && <img src={slide.bg.image} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      {slide.bg.dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: slide.bg.dim }} aria-hidden="true" />}
      {slide.els.map((e) => (
        <div key={e.id} onPointerDown={(ev) => drag(ev, e)}
          className={edit ? "cursor-move" : ""}
          style={{ position: "absolute", left: `${e.x}%`, top: `${e.y}%`, width: `${e.w}%`, transform: `translate(-50%,-50%) rotate(${e.rot}deg)`, touchAction: edit ? "none" : undefined,
            outline: sel === e.id ? "2px dashed #7ee8d8" : undefined, outlineOffset: 4 }}>
          {e.type === "text" ? (
            <p className={`${FONT[e.font]} whitespace-pre-wrap break-words leading-[1.15]`}
              style={{ fontSize: `${e.size / 3.6}cqw`, color: e.color, textAlign: e.align, fontWeight: e.bold ? 800 : 500, fontStyle: e.italic ? "italic" : "normal",
                ...(e.bar ? { borderLeft: `0.9cqw solid ${e.color}`, paddingLeft: "3cqw" } : {}) }}>
              {c(e.text) || (edit ? "…" : "")}
            </p>
          ) : (
            <img src={e.src} alt="" draggable={false} className="block w-full object-cover" style={e.round ? { borderRadius: "50%", aspectRatio: "1" } : { borderRadius: "2cqw" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/** O‘quvchi uchun: slaydlar gorizontal suriladi (swipe), tepada nuqtalar. */
export function SlideDeck({ slides, c }: { slides: Slide[]; c: (s: string) => string }) {
  return (
    <>
      <div className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {slides.map((s, i) => (
          <div key={i} className="relative h-full min-w-full snap-center"><SlideCanvas slide={s} c={c} fill /></div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="pointer-events-none absolute left-0 right-0 top-2 z-10 flex justify-center gap-1" aria-hidden="true">
          {slides.map((_, i) => <i key={i} className="h-1 w-5 rounded-full bg-white/60" />)}
        </div>
      )}
    </>
  );
}
