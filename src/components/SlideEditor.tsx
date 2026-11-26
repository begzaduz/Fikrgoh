import { useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpToLine, Bold, Copy, ImagePlus, Italic, Plus, Trash2, Undo2 } from "lucide-react";
import { MAX_IMAGE_BYTES, uploadImage } from "../lib/api";
import { BGS, COLORS, MAX_ELS, MAX_SLIDES, TEMPLATES, blankSlide, newText, uid, type El, type Font, type Slide, type TextKind } from "../lib/slides";
import { SlideCanvas } from "./SlideCanvas";

const KINDS: Array<[TextKind, string]> = [["quote", "Iqtibos"], ["title", "Sarlavha"], ["caption", "Izoh"], ["plain", "Matn"]];
const FONTS: Array<[Font, string]> = [["display", "Zamonaviy"], ["serif", "Serif"], ["sans", "Oddiy"]];

/** Canva'ga o‘xshash slayd muharriri: slaydlar, fon, matn uslublari, rasm, surish, o‘lcham, aylantirish, qatlamlar, nusxa, bekor qilish. */
export function SlideEditor({ slides, onChange, u, c }: { slides: Slide[]; onChange: (s: Slide[]) => void; u: (s: string) => string; c: (s: string) => string }) {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const hist = useRef<Slide[][]>([]);
  const last = useRef(0);
  const elPick = useRef<HTMLInputElement>(null);
  const bgPick = useRef<HTMLInputElement>(null);

  const i = Math.min(idx, slides.length - 1);
  const slide = slides[i]!;
  const el = slide.els.find((e) => e.id === sel) ?? null;

  const commit = (next: Slide[]) => {
    const now = Date.now();
    if (now - last.current > 500) hist.current = [...hist.current.slice(-40), slides];
    last.current = now;
    onChange(next);
  };
  const undo = () => { const p = hist.current.pop(); if (p) { last.current = 0; onChange(p); setSel(null); setIdx((v) => Math.min(v, p.length - 1)); } };
  const setSlide = (f: (s: Slide) => Slide) => commit(slides.map((s, k) => (k === i ? f(s) : s)));
  const setEl = (id: string, patch: Partial<El>) => setSlide((s) => ({ ...s, els: s.els.map((e) => (e.id === id ? ({ ...e, ...patch } as El) : e)) }));
  const addEl = (e: El) => { if (slide.els.length >= MAX_ELS) return setErr("Bitta slaydda 12 tadan ko‘p element bo‘lmaydi."); setSlide((s) => ({ ...s, els: [...s.els, e] })); setSel(e.id); };

  const addSlide = () => { if (slides.length >= MAX_SLIDES) return setErr("10 tadan ko‘p slayd bo‘lmaydi."); commit([...slides, blankSlide(slide.bg.css)]); setIdx(slides.length); setSel(null); };
  const dupSlide = () => { if (slides.length >= MAX_SLIDES) return; const cp: Slide = { bg: { ...slide.bg }, els: slide.els.map((e) => ({ ...e, id: uid() })) }; commit([...slides.slice(0, i + 1), cp, ...slides.slice(i + 1)]); setIdx(i + 1); };
  const delSlide = () => { if (slides.length === 1) return commit([blankSlide(slide.bg.css)]); commit(slides.filter((_, k) => k !== i)); setIdx(Math.max(0, i - 1)); setSel(null); };
  const moveSlide = (d: -1 | 1) => { const j = i + d; if (j < 0 || j >= slides.length) return; const n = [...slides]; [n[i], n[j]] = [n[j]!, n[i]!]; commit(n); setIdx(j); };
  const layer = (to: "front" | "back") => el && setSlide((s) => ({ ...s, els: to === "front" ? [...s.els.filter((e) => e.id !== el.id), el] : [el, ...s.els.filter((e) => e.id !== el.id)] }));
  const dupEl = () => el && addEl({ ...el, id: uid(), x: Math.min(95, el.x + 5), y: Math.min(95, el.y + 5) });
  const delEl = () => { if (!el) return; setSlide((s) => ({ ...s, els: s.els.filter((e) => e.id !== el.id) })); setSel(null); };

  const upload = async (f: File | undefined, kind: "el" | "bg") => {
    setErr("");
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErr("Faqat JPG, PNG yoki WebP rasm tanlang.");
    if (f.size > MAX_IMAGE_BYTES) return setErr("Rasm juda katta (5 MB gacha).");
    setBusy(0);
    try {
      const src = await uploadImage(f, setBusy);
      if (kind === "bg") setSlide((s) => ({ ...s, bg: { ...s.bg, image: src, dim: s.bg.dim || 0.25 } }));
      else addEl({ id: uid(), type: "image", x: 50, y: 40, w: 60, rot: 0, src, round: false });
    } catch (e) { setErr(`Rasm yuklanmadi: ${e instanceof Error ? e.message : "noma’lum xato"}`); }
    setBusy(null);
  };

  const btn = "flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-xl bg-sand px-2.5 text-[12px] font-semibold disabled:opacity-40";
  const chip = (on: boolean) => `min-h-[36px] rounded-full border px-3 text-[12px] font-semibold ${on ? "border-clay bg-clay text-onclay" : "border-line text-muted"}`;
  const range = (label: string, v: number, lo: number, hi: number, on: (n: number) => void, step = 1) => (
    <label className="flex items-center gap-2 text-[12px] text-muted"><span className="w-16 shrink-0">{u(label)}</span>
      <input type="range" min={lo} max={hi} step={step} value={v} onChange={(e) => on(Number(e.target.value))} className="h-8 flex-1" aria-label={u(label)} /></label>
  );

  return (
    <div className="space-y-3 rounded-2xl border border-line p-3">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={u("Slaydlar")}>
        {slides.map((_, k) => (
          <button key={k} role="tab" aria-selected={k === i} className={`${chip(k === i)} min-w-[40px]`} onClick={() => { setIdx(k); setSel(null); }}>{k + 1}</button>
        ))}
        <button className={btn} onClick={addSlide} aria-label={u("Slayd qo‘shish")}><Plus size={16} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button className={btn} onClick={() => moveSlide(-1)} disabled={i === 0} aria-label={u("Chapga")}><ArrowLeft size={16} /></button>
        <button className={btn} onClick={() => moveSlide(1)} disabled={i === slides.length - 1} aria-label={u("O‘ngga")}><ArrowRight size={16} /></button>
        <button className={btn} onClick={dupSlide} aria-label={u("Slaydni nusxalash")}><Copy size={16} /></button>
        <button className={btn} onClick={delSlide} aria-label={u("Slaydni o‘chirish")}><Trash2 size={16} /></button>
        <button className={btn} onClick={undo} aria-label={u("Bekor qilish")}><Undo2 size={16} /></button>
      </div>

      <div className="mx-auto w-[58%] max-w-[240px]">
        <SlideCanvas slide={slide} c={(s) => s} sel={sel} onSel={setSel} onMove={(id, x, y) => setEl(id, { x, y })} />
      </div>
      <p className="text-center text-[11px] text-muted">{u("Elementni barmoq bilan suring")}</p>

      <div className="space-y-2">
        <span className="text-[12px] font-semibold text-muted">{u("Qo‘shish")}</span>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map(([k, l]) => <button key={k} className={btn} onClick={() => addEl(newText(k, ""))}><Plus size={14} /> {u(l)}</button>)}
          <button className={btn} onClick={() => elPick.current?.click()} disabled={busy !== null}><ImagePlus size={16} /> {busy !== null ? `${busy}%` : u("Rasm")}</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => <button key={t.name} className={chip(false)} onClick={() => { setSlide((s) => ({ ...s, els: t.make("") })); setSel(null); }}>{u(t.name)}</button>)}
        </div>
        <input ref={elPick} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={u("Rasm tanlash")} onChange={(e) => { void upload(e.target.files?.[0], "el"); e.target.value = ""; }} />
        <input ref={bgPick} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={u("Fon rasmi")} onChange={(e) => { void upload(e.target.files?.[0], "bg"); e.target.value = ""; }} />
      </div>

      <div className="space-y-2">
        <span className="text-[12px] font-semibold text-muted">{u("Fon")}</span>
        <div className="flex flex-wrap items-center gap-2">
          {BGS.map((b) => (
            <button key={b} aria-label={u("Fon rangi")} onClick={() => setSlide((s) => ({ ...s, bg: { ...s.bg, css: b, image: null, dim: 0 } }))}
              className={`h-9 w-9 rounded-full border-2 ${slide.bg.css === b && !slide.bg.image ? "border-clay" : "border-line"}`} style={{ background: b }} />
          ))}
          <button className={btn} onClick={() => bgPick.current?.click()}><ImagePlus size={16} /> {u("Fon rasmi")}</button>
          {slide.bg.image && <button className={chip(false)} onClick={() => setSlide((s) => ({ ...s, bg: { ...s.bg, image: null, dim: 0 } }))}>{u("Olib tashlash")}</button>}
        </div>
        {slide.bg.image && range("Qorayish", slide.bg.dim, 0, 0.8, (n) => setSlide((s) => ({ ...s, bg: { ...s.bg, dim: n } })), 0.05)}
      </div>

      {el && (
        <div className="space-y-2 rounded-xl bg-sand p-3">
          {el.type === "text" && (
            <>
              <textarea value={el.text} onChange={(e) => setEl(el.id, { text: e.target.value })} maxLength={400} aria-label={u("Slayd matni")} placeholder={u("Matn yozing")}
                className="min-h-[80px] w-full resize-none rounded-xl border border-line bg-paper p-2.5 text-base text-ink" />
              <div className="flex flex-wrap gap-1.5">
                {FONTS.map(([f, l]) => <button key={f} className={chip(el.font === f)} onClick={() => setEl(el.id, { font: f })}>{u(l)}</button>)}
                <button className={chip(el.bold)} aria-pressed={el.bold} aria-label="Bold" onClick={() => setEl(el.id, { bold: !el.bold })}><Bold size={14} /></button>
                <button className={chip(el.italic)} aria-pressed={el.italic} aria-label="Italic" onClick={() => setEl(el.id, { italic: !el.italic })}><Italic size={14} /></button>
                <button className={chip(el.bar)} aria-pressed={el.bar} onClick={() => setEl(el.id, { bar: !el.bar })}>{u("Iqtibos chizig‘i")}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["left", "center", "right"] as const).map((a) => <button key={a} className={chip(el.align === a)} onClick={() => setEl(el.id, { align: a })}>{{ left: "⇤", center: "↔", right: "⇥" }[a]}</button>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((col) => <button key={col} aria-label={col} onClick={() => setEl(el.id, { color: col })} className={`h-8 w-8 rounded-full border-2 ${el.color === col ? "border-clay" : "border-line"}`} style={{ background: col }} />)}
              </div>
              {range("O‘lcham", el.size, 10, 100, (n) => setEl(el.id, { size: n }))}
            </>
          )}
          {el.type === "image" && <button className={chip(el.round)} aria-pressed={el.round} onClick={() => setEl(el.id, { round: !el.round })}>{u("Dumaloq")}</button>}
          {range("Kenglik", el.w, 10, 100, (n) => setEl(el.id, { w: n }))}
          {range("Burish", el.rot, -45, 45, (n) => setEl(el.id, { rot: n }))}
          <div className="flex flex-wrap gap-1.5">
            <button className={btn} onClick={() => layer("front")} aria-label={u("Oldinga")}><ArrowUpToLine size={16} /></button>
            <button className={btn} onClick={() => layer("back")} aria-label={u("Orqaga")}><ArrowDownToLine size={16} /></button>
            <button className={btn} onClick={dupEl} aria-label={u("Nusxalash")}><Copy size={16} /></button>
            <button className={`${btn} text-clay`} onClick={delEl} aria-label={u("Elementni o‘chirish")}><Trash2 size={16} /></button>
          </div>
        </div>
      )}
      {err && <p role="alert" className="text-[13px] text-clay">{u(err)}</p>}
    </div>
  );
}
