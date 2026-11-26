import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Minus, Quote, Trash2, Type, Heading, List } from "lucide-react";
import { MAX_IMAGE_BYTES, uploadImage } from "../lib/api";
import { newBlock, type ContentBlock, type ContentBlockType } from "../lib/content";

const TYPES: Array<{ type: ContentBlockType; label: string; icon: typeof Type }> = [
  { type: "text", label: "Matn", icon: Type },
  { type: "heading", label: "Sarlavha", icon: Heading },
  { type: "quote", label: "Iqtibos", icon: Quote },
  { type: "list", label: "Ro‘yxat", icon: List },
  { type: "image", label: "Rasm", icon: ImagePlus },
  { type: "divider", label: "Ajratgich", icon: Minus },
];

export function EditorialBlockEditor({ blocks, onChange, u }: { blocks: ContentBlock[]; onChange: (v: ContentBlock[]) => void; u: (s: string) => string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pickers = useRef<Record<string, HTMLInputElement | null>>({});
  const patch = (id: string, next: Partial<ContentBlock>) => onChange(blocks.map((b) => b.id === id ? { ...b, ...next } : b));
  const move = (index: number, direction: -1 | 1) => {
    const next = [...blocks]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!]; onChange(next);
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
  const add = (type: ContentBlockType) => onChange([...blocks, newBlock(type)]);
  const field = "w-full rounded-xl border border-line bg-sand p-3 text-[15px] leading-relaxed text-ink placeholder:text-muted focus-visible:outline-none";
  return (
    <section className="space-y-3" aria-label={u("Matn muharriri")}>
      {blocks.map((b, i) => (
        <article key={b.id} className="rounded-2xl border border-line bg-paper/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-muted">{u(TYPES.find((x) => x.type === b.type)?.label ?? "Matn")}</span>
            <div className="flex items-center gap-1">
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={u("Yuqoriga")}><ArrowUp size={15} /></button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted disabled:opacity-30" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label={u("Pastga")}><ArrowDown size={15} /></button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted" onClick={() => onChange(blocks.filter((x) => x.id !== b.id))} aria-label={u("O‘chirish")}><Trash2 size={15} /></button>
            </div>
          </div>
          {b.type === "divider" && <div className="py-3"><div className="h-px bg-line" /></div>}
          {(b.type === "text" || b.type === "heading" || b.type === "quote") && (
            <textarea className={field + " resize-y " + (b.type === "heading" ? "min-h-[58px] text-xl font-semibold" : b.type === "quote" ? "min-h-[100px] font-serif text-lg italic" : "min-h-[130px] font-serif text-[17px]")}
              value={b.text ?? ""} onChange={(e) => patch(b.id, { text: e.target.value })}
              placeholder={u(b.type === "heading" ? "Bo‘lim sarlavhasi" : b.type === "quote" ? "Iqtibos yoki alohida ta’kid" : "Fikringizni shu yerda yozing...")}
              aria-label={u(TYPES.find((x) => x.type === b.type)?.label ?? "Matn")} />
          )}
          {b.type === "list" && (
            <textarea className={field + " min-h-[110px] resize-y"} value={(b.items ?? []).join("\n")} onChange={(e) => patch(b.id, { items: e.target.value.split("\n").slice(0, 30) })} placeholder={u("Har bir bandni yangi qatordan yozing")} aria-label={u("Ro‘yxat")} />
          )}
          {b.type === "image" && (
            <>
              <input ref={(el) => { pickers.current[b.id] = el; }} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { void upload(b.id, e.target.files?.[0]); e.target.value = ""; }} />
              {b.url && <img src={b.url} alt="" className="mb-2 max-h-64 w-full rounded-xl object-cover" />}
              <button type="button" className="flex min-h-10 items-center gap-2 rounded-xl bg-sand px-3 text-sm font-semibold" onClick={() => pickers.current[b.id]?.click()}><ImagePlus size={17} />{busy === b.id ? u("Yuklanmoqda...") : u(b.url ? "Rasmni almashtirish" : "Rasm tanlash")}</button>
              <input className={field + " mt-2"} value={b.caption ?? ""} onChange={(e) => patch(b.id, { caption: e.target.value })} placeholder={u("Rasm izohi (ixtiyoriy)")} />
            </>
          )}
        </article>
      ))}
      <div className="rounded-2xl border border-dashed border-line p-3">
        <p className="mb-2 text-[12px] font-semibold text-muted">{u("Kontent blokini qo‘shish")}</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(({ type, label, icon: Icon }) => <button type="button" key={type} onClick={() => add(type)} className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl bg-sand text-[12px] font-semibold"><Icon size={18} />{u(label)}</button>)}
        </div>
      </div>
      {error && <p role="alert" className="text-[13px] text-clay">{u(error)}</p>}
    </section>
  );
}
