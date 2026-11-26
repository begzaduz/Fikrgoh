import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Heading, ImagePlus, List, Minus, Plus, Quote, Trash2, Type } from "lucide-react";
import { MAX_IMAGE_BYTES, proxied, uploadImage } from "../lib/api";
import { newBlock, type ContentBlock, type ContentBlockType } from "../lib/content";

const TYPES: Array<{ type: ContentBlockType; label: string; icon: typeof Type }> = [
  { type: "text", label: "Matn", icon: Type },
  { type: "heading", label: "Sarlavha", icon: Heading },
  { type: "quote", label: "Iqtibos", icon: Quote },
  { type: "list", label: "Ro‘yxat", icon: List },
  { type: "image", label: "Rasm", icon: ImagePlus },
  { type: "divider", label: "Ajratgich", icon: Minus },
];

const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

/** Hujjatga o‘xshash blokli muharrir: ramkasiz matn, Enter — yangi blok, bloklar orasiga "+" bilan qo‘shish. */
export function EditorialBlockEditor({ blocks, onChange, u }: { blocks: ContentBlock[]; onChange: (v: ContentBlock[]) => void; u: (s: string) => string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const areas = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pickers = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (focusId) { areas.current[focusId]?.focus(); setFocusId(null); }
  }, [focusId, blocks]);
  useEffect(() => { Object.values(areas.current).forEach(grow); });

  const patch = (id: string, next: Partial<ContentBlock>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...next } : b)));
  const insertAt = (i: number, type: ContentBlockType) => {
    const b = newBlock(type);
    onChange([...blocks.slice(0, i), b, ...blocks.slice(i)]);
    setOpenAt(null);
    setFocusId(b.id);
  };
  const remove = (i: number) => {
    if (blocks.length === 1) return onChange([newBlock("text")]);
    const prev = blocks[i - 1] ?? blocks[i + 1];
    onChange(blocks.filter((_, k) => k !== i));
    if (prev) setFocusId(prev.id);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const n = [...blocks];
    [n[i], n[j]] = [n[j]!, n[i]!];
    onChange(n);
  };
  const onKey = (e: React.KeyboardEvent, b: ContentBlock, i: number) => {
    if ((b.type === "text" || b.type === "heading") && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      insertAt(i + 1, "text");
    } else if (e.key === "Backspace" && !(b.text ?? "") && b.type !== "list" && blocks.length > 1) {
      e.preventDefault();
      remove(i);
    }
  };
  const upload = async (id: string, file?: File) => {
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Faqat JPG, PNG yoki WebP rasm tanlang.");
    if (file.size > MAX_IMAGE_BYTES) return setError("Rasm hajmi 5 MB dan oshmasligi kerak.");
    setBusy(id);
    try { patch(id, { url: await uploadImage(file, () => {}) }); }
    catch (e) { setError(e instanceof Error ? e.message : "Rasm yuklanmadi."); }
    setBusy(null);
  };

  const base = "w-full resize-none overflow-hidden bg-transparent text-ink placeholder:text-muted focus-visible:outline-none";
  const ctl = "flex h-8 w-8 items-center justify-center rounded-lg text-muted disabled:opacity-30";

  const inserter = (i: number) => (
    <div className="relative flex h-7 items-center" key={`ins-${i}`}>
      <div className="h-px flex-1 bg-line/60" />
      <button type="button" onClick={() => setOpenAt(openAt === i ? null : i)} aria-expanded={openAt === i} aria-label={u("Blok qo‘shish")}
        className="mx-2 flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted"><Plus size={15} /></button>
      <div className="h-px flex-1 bg-line/60" />
      {openAt === i && (
        <div className="absolute left-1/2 top-8 z-20 grid w-[min(100%,300px)] -translate-x-1/2 grid-cols-3 gap-1.5 rounded-2xl border border-line bg-paper p-2 shadow-lg">
          {TYPES.map(({ type, label, icon: Icon }) => (
            <button type="button" key={type} onClick={() => insertAt(i, type)} className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl bg-sand text-[12px] font-semibold"><Icon size={17} />{u(label)}</button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section aria-label={u("Matn muharriri")} className="space-y-1">
      {blocks.map((b, i) => (
        <div key={b.id}>
          <div className="group rounded-xl px-1 py-1">
            <div className="mb-0.5 flex items-center justify-end gap-0.5 opacity-40 transition-opacity group-focus-within:opacity-100">
              <button type="button" className={ctl} disabled={i === 0} onClick={() => move(i, -1)} aria-label={u("Yuqoriga")}><ArrowUp size={14} /></button>
              <button type="button" className={ctl} disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label={u("Pastga")}><ArrowDown size={14} /></button>
              <button type="button" className={ctl} onClick={() => remove(i)} aria-label={u("O‘chirish")}><Trash2 size={14} /></button>
            </div>
            {b.type === "divider" && <div className="py-3 text-center text-muted" aria-hidden="true">· · ·</div>}
            {(b.type === "text" || b.type === "heading" || b.type === "quote") && (
              <textarea ref={(el) => { areas.current[b.id] = el; }} rows={1} value={b.text ?? ""} onChange={(e) => patch(b.id, { text: e.target.value })} onKeyDown={(e) => onKey(e, b, i)}
                className={`${base} ${b.type === "heading" ? "font-display text-[24px] font-semibold leading-tight" : b.type === "quote" ? "border-l-2 border-clay pl-4 font-serif text-[20px] italic leading-relaxed" : "font-serif text-[18px] leading-[1.75]"}`}
                placeholder={u(b.type === "heading" ? "Bo‘lim sarlavhasi" : b.type === "quote" ? "Iqtibos yoki alohida ta’kid" : i === 0 ? "Fikringizni shu yerda yozing..." : "Davomini yozing...")}
                aria-label={u(TYPES.find((x) => x.type === b.type)?.label ?? "Matn")} />
            )}
            {b.type === "list" && (
              <textarea ref={(el) => { areas.current[b.id] = el; }} rows={2} value={(b.items ?? []).join("\n")} onChange={(e) => patch(b.id, { items: e.target.value.split("\n").slice(0, 30) })}
                className={`${base} list-item font-serif text-[18px] leading-[1.75]`} placeholder={u("Har bir bandni yangi qatordan yozing")} aria-label={u("Ro‘yxat")} />
            )}
            {b.type === "image" && (
              <div className="space-y-2">
                <input ref={(el) => { pickers.current[b.id] = el; }} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={u("Rasm tanlash")}
                  onChange={(e) => { void upload(b.id, e.target.files?.[0]); e.target.value = ""; }} />
                {b.url && <img src={proxied(b.url)} alt="" className="max-h-64 w-full rounded-2xl object-cover" />}
                <button type="button" className="flex min-h-10 items-center gap-2 rounded-xl bg-sand px-3 text-sm font-semibold" onClick={() => pickers.current[b.id]?.click()}>
                  <ImagePlus size={17} />{busy === b.id ? u("Yuklanmoqda...") : u(b.url ? "Rasmni almashtirish" : "Rasm tanlash")}
                </button>
                <input className={`${base} text-center text-[13px]`} value={b.caption ?? ""} onChange={(e) => patch(b.id, { caption: e.target.value })} placeholder={u("Rasm izohi (ixtiyoriy)")} aria-label={u("Rasm izohi")} />
              </div>
            )}
          </div>
          {inserter(i + 1)}
        </div>
      ))}
      {error && <p role="alert" className="text-[13px] text-clay">{u(error)}</p>}
    </section>
  );
}
