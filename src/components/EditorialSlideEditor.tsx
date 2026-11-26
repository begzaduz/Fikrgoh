import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { MAX_IMAGE_BYTES, uploadImage } from "../lib/api";
import { BGS, blankSlide, newText, type Slide } from "../lib/slides";
import { SlideCanvas } from "./SlideCanvas";

export function EditorialSlideEditor({ slides, onChange, u }: { slides: Slide[]; onChange: (v: Slide[]) => void; u: (s: string) => string }) {
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const slide = slides[Math.min(active, slides.length - 1)];
  if (!slide) return null;
  const textEl = slide.els.find((e) => e.type === "text");
  const text = textEl?.type === "text" ? textEl.text : "";
  const patch = (next: Slide) => onChange(slides.map((s, i) => i === active ? next : s));
  const setText = (value: string) => {
    const first = slide.els.find((e) => e.type === "text");
    const els = first
      ? slide.els.map((e) => e.id === first.id && e.type === "text" ? { ...e, text: value } : e)
      : [...slide.els, newText("plain", value, { y: 50, size: 25, w: 82 })];
    patch({ ...slide, els });
  };
  const addSlide = () => {
    if (slides.length >= 10) return;
    onChange([...slides, blankSlide(slide.bg.css)]);
    setActive(slides.length);
  };
  const removeSlide = () => {
    if (slides.length === 1) return;
    onChange(slides.filter((_, i) => i !== active));
    setActive(Math.max(0, active - 1));
  };
  const setBackground = (css: string) => patch({ ...slide, bg: { ...slide.bg, css, image: null, dim: 0, fade: 0 } });
  const uploadBackground = async (file?: File) => {
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Faqat JPG, PNG yoki WebP rasm tanlang.");
    if (file.size > MAX_IMAGE_BYTES) return setError("Rasm hajmi 5 MB dan oshmasligi kerak.");
    setUploading(true);
    try { patch({ ...slide, bg: { ...slide.bg, image: await uploadImage(file, () => {}), dim: 0.35, fade: 0 } }); }
    catch (e) { setError(e instanceof Error ? e.message : "Rasm yuklanmadi."); }
    setUploading(false);
  };
  return (
    <section className="space-y-3 rounded-2xl border border-line p-3">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-semibold">{u("Slaydli fikr")}</p><p className="text-[11px] text-muted">{u("Har bir sahifada bitta asosiy fikr")}</p></div>
        <span className="text-xs tabular-nums text-muted">{active + 1} / {slides.length}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {slides.map((s, i) => <button type="button" key={i} onClick={() => setActive(i)} className={"w-12 shrink-0 rounded-lg border-2 p-0.5 " + (i === active ? "border-clay" : "border-transparent")} aria-label={u("Slayd") + " " + (i + 1)}>
          <div className="pointer-events-none"><SlideCanvas slide={s} c={(x) => x}/></div>
          <span className="block py-0.5 text-center text-[10px] text-muted">{i + 1}</span>
        </button>)}
        <button type="button" onClick={addSlide} disabled={slides.length >= 10} className="flex h-[74px] w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-muted disabled:opacity-30" aria-label={u("Slayd qo‘shish")}><Plus size={18}/></button>
      </div>
      <div className="mx-auto w-[min(58%,240px)]"><SlideCanvas slide={slide} c={(x) => x}/></div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={360} className="min-h-[92px] w-full resize-y rounded-xl border border-line bg-sand p-3 font-serif text-base text-ink placeholder:text-muted" placeholder={u("Ushbu slaydning asosiy fikri...")} aria-label={u("Slayd matni")}/>
      <div className="flex flex-wrap items-center gap-2">
        {BGS.slice(0, 6).map((bg) => <button type="button" key={bg} onClick={() => setBackground(bg)} className="h-8 w-8 rounded-full border-2 border-line" style={{ background: bg }} aria-label={u("Fon tanlash")}/>)}
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { void uploadBackground(e.target.files?.[0]); e.target.value = ""; }}/>
        <button type="button" onClick={() => picker.current?.click()} className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold"><ImagePlus size={15}/>{uploading ? u("Yuklanmoqda") : u("Rasmli fon")}</button>
        <button type="button" onClick={removeSlide} disabled={slides.length === 1} className="ml-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted disabled:opacity-30"><Trash2 size={15}/>{u("O‘chirish")}</button>
      </div>
      {error && <p role="alert" className="text-xs text-clay">{u(error)}</p>}
    </section>
  );
}
