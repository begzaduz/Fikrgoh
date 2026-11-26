import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Film, ImagePlus, Sparkles, X } from "lucide-react";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, aiSlides, proxied, uploadImage, uploadVideo, type Short, type Thought } from "../lib/api";
import { toNew } from "../lib/alphabet";
import { canPlayVideo, inspectMp4 } from "../lib/video";
import { SlideEditor } from "./SlideEditor";
import { EditorialBlockEditor } from "./EditorialBlockEditor";
import { EditorialSlideEditor } from "./EditorialSlideEditor";
import { Reader } from "./Reader";
import { CATEGORY_LABEL } from "./ThoughtCard";
import { blocksToText, newBlock, type ContentBlock } from "../lib/content";
import { blankSlide, hasContent, mapText, slidesFromPlan, slidesText, type Slide } from "../lib/slides";
import { useApp, type ComposerState } from "../store";

const TONES: Array<[Short["tone"], string]> = [["sand", "Indigo"], ["sage", "Firuza"], ["ink", "Tun"], ["clay", "Tong"]];
const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
const DRAFT = "fg-draft";
type Format = "quick" | "article" | "slides";
type Draft = { format: Format; topic: string; title: string; blocks: ContentBlock[]; slides: Slide[] | null };

const loadDraft = (): Draft | null => {
  try { const d = JSON.parse(localStorage.getItem(DRAFT) ?? "null"); return d && Array.isArray(d.blocks) ? d : null; } catch { return null; }
};
const saveDraft = (d: Draft | null) => {
  try { d ? localStorage.setItem(DRAFT, JSON.stringify(d)) : localStorage.removeItem(DRAFT); } catch { /* xotira yopiq */ }
};

/**
 * Admin uchun yozish oynasi (editorial): format → mavzu → muqova → sarlavha → bloklar.
 * Qoralama avtomatik saqlanadi, nashrdan oldin o‘quvchi ko‘rinishida ko‘rib chiqiladi.
 * Matn eski alifboda yozilsa, yangisiga (kanonik) avtomatik o‘giriladi.
 */
export function Composer({ state, onClose }: { state: Exclude<ComposerState, null>; onClose: () => void }) {
  const { publish, u, c, thoughts } = useApp();
  const edit = state.mode === "edit" ? state : null;
  const draft = useMemo(() => (edit ? null : loadDraft()), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [restored, setRestored] = useState(!!draft);

  const [kind, setKind] = useState<"thought" | "short">(edit?.kind ?? "thought");
  const [format, setFormat] = useState<Format>(edit?.kind === "thought" ? edit.format ?? "article" : draft?.format ?? "article");
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    edit?.kind === "thought" && edit.blocks?.length ? edit.blocks
      : edit?.kind === "thought" && edit.body ? [{ id: "legacy-body", type: "text", text: edit.body }]
      : draft?.blocks.length ? draft.blocks : [newBlock("text")],
  );
  const [topic, setTopic] = useState(edit?.category ?? draft?.topic ?? "");
  const [tone, setTone] = useState<Short["tone"]>(edit?.kind === "short" ? edit.tone : "sand");
  const [title, setTitle] = useState(edit?.kind === "thought" ? edit.title : draft?.title ?? "");
  const [body, setBody] = useState(edit ? (edit.kind === "thought" ? edit.body : edit.quote) : "");
  const [slides, setSlides] = useState<Slide[]>(edit?.slides?.length ? edit.slides : draft?.slides?.length ? draft.slides : [blankSlide()]);
  const [classic, setClassic] = useState(edit?.kind === "short" && !edit.slides?.length);
  const slideMode = (kind === "short" && !classic) || (kind === "thought" && format === "slides");
  const [already, setAlready] = useState(!!edit);
  const [video, setVideo] = useState<string | null>(edit?.kind === "short" ? edit.video_url : null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [fileWarn, setFileWarn] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saved, setSaved] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // ---- AI: matnni slaydlarga bo‘lish ----
  const [aiText, setAiText] = useState(() => (edit ? "" : draft?.blocks.length ? blocksToText(draft.blocks) : ""));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const makeSlides = async () => {
    if (aiBusy || aiText.trim().length < 10) return;
    if (hasContent(slides) && !window.confirm(u("Mavjud slaydlar almashtiriladi. Davom etasizmi?"))) return;
    setAiBusy(true);
    setAiMsg("");
    try {
      const r = await aiSlides(aiText.trim());
      const next = slidesFromPlan(r.slides);
      if (next.length) setSlides(next);
      setAiMsg(r.note || `${next.length} ${u("slayd tayyor. Ko‘rib chiqing va kerak bo‘lsa tahrirlang.")}`);
    } catch (e) {
      setAiMsg(`${u("Slaydga aylantirib bo‘lmadi")}: ${e instanceof Error ? e.message : "xato"}`);
    }
    setAiBusy(false);
  };

  // ---- Muqova rasm ----
  const [image, setImage] = useState<string | null>(edit?.kind === "thought" ? edit.image_url ?? null : null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgError, setImgError] = useState("");
  const [objUrl, setObjUrl] = useState<string | null>(null);
  const imgPicker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!imgFile) return setObjUrl(null);
    const x = URL.createObjectURL(imgFile);
    setObjUrl(x);
    return () => URL.revokeObjectURL(x);
  }, [imgFile]);
  const cover = objUrl ?? (image ? proxied(image) : null);
  const pickImage = (f: File | undefined) => {
    setImgError("");
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setImgError("Faqat JPG, PNG yoki WebP rasm tanlang.");
    if (f.size > MAX_IMAGE_BYTES) return setImgError(`Rasm juda katta (${mb(f.size)} MB). Chegara: 5 MB.`);
    setImgFile(f);
  };

  // ---- Hosilalar ----
  const conv = (s: string) => (already ? s : toNew(s));
  const convBlocks = (bs: ContentBlock[]) => bs.map((b) => ({ ...b, ...(b.text !== undefined ? { text: conv(b.text) } : {}), ...(b.items ? { items: b.items.map(conv) } : {}), ...(b.caption ? { caption: conv(b.caption) } : {}) }));
  const finalCategory = conv(topic.trim().toLowerCase());
  const hasVideo = !!file || !!video;
  const writtenBody = format === "slides" ? slidesText(slides) : blocksToText(blocks);
  const words = writtenBody.trim() ? writtenBody.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 180));
  const minChars = format === "quick" ? 10 : 20;
  const contentOk = format === "slides" ? hasContent(slides) : writtenBody.trim().length >= minChars;
  const valid = kind === "thought" ? title.trim().length >= 3 && contentOk : slideMode ? hasContent(slides) : body.trim().length >= 5 || hasVideo;
  const validAll = valid && topic.trim().length >= 2;
  const missing = [topic.trim().length < 2 && "mavzu", kind === "thought" && title.trim().length < 3 && "sarlavha", (kind === "thought" ? !contentOk : !valid) && "matn"].filter(Boolean) as string[];
  const changed = !already && kind === "short" && !slideMode && conv(body) !== body;

  // ---- Qoralama: faqat yangi fikr uchun ----
  useEffect(() => {
    if (edit || kind !== "thought") return;
    const t = window.setTimeout(() => {
      const empty = !title.trim() && !topic.trim() && !writtenBody.trim();
      saveDraft(empty ? null : { format, topic, title, blocks, slides: format === "slides" ? slides : null });
      setSaved(!empty);
    }, 700);
    return () => window.clearTimeout(t);
  }, [edit, kind, format, topic, title, blocks, slides, writtenBody]);
  const discardDraft = () => {
    saveDraft(null);
    setRestored(false); setSaved(false);
    setTopic(""); setTitle(""); setBlocks([newBlock("text")]); setSlides([blankSlide()]); setAiText("");
  };

  // ---- Mavzu chiplari: asosiy yo‘nalishlar + lentadagi mavjud mavzular ----
  const topics = useMemo(() => [...new Set([...Object.keys(CATEGORY_LABEL), ...thoughts.map((t) => t.category)])], [thoughts]);

  const pick = async (f: File | undefined) => {
    setFileError("");
    setFileWarn("");
    if (!f) return;
    if (!f.type.startsWith("video/")) return setFileError("Faqat video fayl tanlang (MP4 tavsiya etiladi).");
    if (f.size > MAX_VIDEO_BYTES) return setFileError(`Fayl juda katta (${mb(f.size)} MB). Chegara: 50 MB.`);
    setChecking(true);
    const ok = await canPlayVideo(f);
    setChecking(false);
    if (!ok) return setFileError("Bu videoni ochib bo‘lmadi: kodek qo‘llab-quvvatlanmaydi. Uni H.264 + AAC kodekli MP4 qilib qayta eksport qiling.");
    const info = await inspectMp4(f);
    if (info.codec === "hevc" || info.codec === "av1")
      return setFileError("Bu video HEVC/AV1 kodekda: ko‘p Android va Telegram Desktop'da ochilmaydi. H.264 + AAC kodekli MP4 qilib qayta eksport qiling.");
    if (info.faststart === false) setFileWarn("Faylda faststart yo‘q: video sekin boshlanishi mumkin. ffmpeg bilan -movflags +faststart qo‘shib qayta saqlang.");
    setFile(f);
  };

  const submit = async () => {
    if (!validAll || busy) return;
    setBusy(true);
    let url = video;
    if (kind === "short" && file && !slideMode) {
      try { setProgress(0); url = await uploadVideo(file, setProgress); }
      catch (e) { setBusy(false); setProgress(null); return setFileError(`Video yuklanmadi: ${e instanceof Error ? e.message : "noma’lum xato"}`); }
    }
    let imgUrl = image;
    if (kind === "thought" && imgFile) {
      try { setProgress(0); imgUrl = await uploadImage(imgFile, setProgress); }
      catch (e) { setBusy(false); setProgress(null); return setImgError(`Rasm yuklanmadi: ${e instanceof Error ? e.message : "noma’lum xato"}`); }
    }
    const id = edit?.id;
    const ok = await publish(
      kind === "thought"
        ? { kind, id, category: finalCategory, title: conv(title.trim()), body: conv(writtenBody.trim()), format, blocks: format === "slides" ? null : convBlocks(blocks), slides: format === "slides" ? mapText(slides, conv) : null, oldSlides: edit?.kind === "thought" ? edit.slides : null, oldBlocks: edit?.kind === "thought" ? edit.blocks : null, imageUrl: imgUrl, oldImageUrl: edit?.kind === "thought" ? edit.image_url ?? null : null }
        : slideMode
          ? { kind, id, category: finalCategory, quote: conv(slidesText(slides)).slice(0, 280), tone, videoUrl: null, oldVideoUrl: edit?.kind === "short" ? edit.video_url : null, slides: mapText(slides, conv), oldSlides: edit?.kind === "short" ? edit.slides : null }
          : { kind, id, category: finalCategory, quote: conv(body.trim()), tone, videoUrl: url, oldVideoUrl: edit?.kind === "short" ? edit.video_url : null, slides: null, oldSlides: edit?.kind === "short" ? edit.slides : null },
    );
    setBusy(false);
    setProgress(null);
    if (ok) { if (!edit) saveDraft(null); onClose(); }
  };

  // ---- Ko‘rib chiqish uchun vaqtinchalik fikr ----
  const previewThought: Thought = {
    id: -1, category: finalCategory || "fikr", title: conv(title.trim()) || "…", body: conv(writtenBody.trim()), read_minutes: minutes, created_at: "",
    likes: 0, liked: false, saved: false, image_url: cover, format,
    blocks: format === "slides" ? null : convBlocks(blocks), slides: format === "slides" ? mapText(slides, conv) : null,
  };

  const chip = (on: boolean) => `min-h-[40px] shrink-0 rounded-full border px-4 text-[13px] font-semibold ${on ? "border-clay bg-clay text-onclay" : "border-line text-muted"}`;
  const field = "w-full rounded-2xl border border-line bg-sand p-3 text-base text-ink placeholder:text-muted";

  return (
    <>
      <motion.div className="fixed inset-0 z-50 flex justify-center bg-paper" role="dialog" aria-modal="true" aria-label={edit ? u("Tahrirlash") : u("Yangi fikr")}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
        <div className="flex h-full w-full max-w-[560px] flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 pb-2 pt-[calc(8px+var(--safe-top))]">
            <div className="min-w-0">
              <h2 className="text-[24px] font-semibold leading-none">{edit ? u("Tahrirlash") : u("Yangi")}</h2>
              {!edit && kind === "thought" && <p className="mt-1 text-[11px] text-muted" aria-live="polite">{saved ? u("Qoralama saqlandi") : "\u00a0"}</p>}
            </div>
            <div className="flex items-center gap-1">
              {kind === "thought" && (
                <button className="flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-clay" onClick={() => setPreviewing(true)} disabled={!title.trim() && !writtenBody.trim()}>
                  <Eye size={18} /> {u("Ko‘rib chiqish")}
                </button>
              )}
              <button className="flex min-h-[44px] min-w-[44px] items-center justify-center" onClick={onClose} aria-label={u("Yopish")}><X size={22} /></button>
            </div>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {restored && !edit && (
              <div className="flex items-center justify-between rounded-2xl bg-sand px-4 py-2.5 text-[13px]" role="status">
                <span>{u("Qoralama tiklandi")}</span>
                <button className="font-semibold text-clay" onClick={discardDraft}>{u("Yangidan boshlash")}</button>
              </div>
            )}

            {!edit && (
              <div className="flex gap-2" role="group" aria-label={u("Turi")}>
                <button className={chip(kind === "thought")} aria-pressed={kind === "thought"} onClick={() => setKind("thought")}>{u("Fikr")}</button>
                <button className={chip(kind === "short")} aria-pressed={kind === "short"} onClick={() => setKind("short")}>Short</button>
              </div>
            )}

            {kind === "thought" && (
              <div className="flex gap-2 overflow-x-auto" role="group" aria-label={u("Fikr formati")}>
                {([["quick", "Qisqa fikr"], ["article", "Maqola"], ["slides", "Slaydli fikr"]] as const).map(([f, label]) => (
                  <button key={f} className={chip(format === f)} aria-pressed={format === f} onClick={() => { if (f === "slides" && !aiText.trim()) setAiText(blocksToText(blocks)); setFormat(f); }}>{u(label)}</button>
                ))}
              </div>
            )}

            {/* Mavzu */}
            <div>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="group" aria-label={u("Yo‘nalish")}>
                {topics.map((k) => (
                  <button key={k} className={chip(finalCategory === k)} aria-pressed={finalCategory === k} onClick={() => { setTopic(k); setAlready(true); }}>
                    {k in CATEGORY_LABEL ? u(CATEGORY_LABEL[k]!) : c(k.charAt(0).toUpperCase() + k.slice(1))}
                  </button>
                ))}
              </div>
              <input value={topic} onChange={(e) => { setTopic(e.target.value); }} maxLength={30} aria-label={u("Mavzu")} placeholder={u("Mavzu (masalan: Sport)")} className={field} />
            </div>

            {/* Muqova */}
            {kind === "thought" && (
              <div>
                <input ref={imgPicker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={u("Rasm tanlash")}
                  onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
                {cover ? (
                  <div className="relative overflow-hidden rounded-2xl">
                    <img src={cover} alt="" className="h-40 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <button className="min-h-[36px] rounded-full bg-black/45 px-3 text-[12px] font-semibold text-white" onClick={() => imgPicker.current?.click()}>{u("Rasmni almashtirish")}</button>
                      <button className="min-h-[36px] rounded-full bg-black/45 px-3 text-[12px] font-semibold text-white" onClick={() => { setImgFile(null); setImage(null); }}>{u("Olib tashlash")}</button>
                    </div>
                  </div>
                ) : (
                  <button className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[13px] font-semibold text-muted" onClick={() => imgPicker.current?.click()}>
                    <ImagePlus size={18} /> {u("Rasm tanlash")} · <span className="font-normal">{u("ixtiyoriy")}</span>
                  </button>
                )}
                {imgError && <p role="alert" className="mt-1 text-[13px] text-clay">{u(imgError)}</p>}
              </div>
            )}

            {/* Sarlavha */}
            {kind === "thought" && (
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} aria-label={u("Sarlavha")} placeholder={u("Sarlavha")}
                className="w-full bg-transparent font-display text-[30px] font-semibold leading-[1.15] text-ink placeholder:text-muted focus-visible:outline-none" />
            )}

            {kind === "short" && (
              <div className="flex gap-2" role="group" aria-label={u("Short turi")}>
                <button className={chip(!classic)} aria-pressed={!classic} onClick={() => setClassic(false)}>{u("Slaydlar")}</button>
                <button className={chip(classic)} aria-pressed={classic} onClick={() => setClassic(true)}>{u("Matn / video")}</button>
              </div>
            )}

            {slideMode && (
              <div className="rounded-2xl border border-line p-3">
                <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} maxLength={4000} aria-label={u("Slaydlar uchun matn")}
                  placeholder={u("Matnni shu yerga yozing, slaydlarga bo‘laman. Matn o‘zgarmaydi.")} className={`${field} min-h-[110px] resize-none`} />
                <button className="mt-2 flex min-h-[44px] items-center gap-2 rounded-xl bg-sand px-4 text-[13px] font-semibold disabled:opacity-50" disabled={aiBusy || aiText.trim().length < 10} onClick={() => void makeSlides()}>
                  <Sparkles size={18} /> {aiBusy ? u("Tayyorlanmoqda...") : u("Slaydga aylantir")}
                </button>
                {aiMsg && <p role="status" className="mt-2 text-[13px] text-muted">{aiMsg}</p>}
              </div>
            )}

            {kind === "thought" && format === "slides" && <EditorialSlideEditor slides={slides} onChange={setSlides} u={u} />}
            {kind === "thought" && format !== "slides" && <EditorialBlockEditor blocks={blocks} onChange={setBlocks} u={u} />}
            {kind === "short" && slideMode && <SlideEditor slides={slides} onChange={setSlides} u={u} c={c} />}
            {kind === "short" && !slideMode && <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={280}
              aria-label={u("Qisqa matn")} placeholder={u("Qisqa fikr yoki video izohi")} className={field + " min-h-[110px] resize-none"} />}

            {kind === "short" && !slideMode && (
              <>
                <div className="rounded-2xl border border-line p-3">
                  <input ref={picker} type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" aria-label={u("Video tanlash")}
                    onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
                  <div className="flex items-center gap-3">
                    <button className="flex min-h-[44px] items-center gap-2 rounded-xl bg-sand px-4 text-[13px] font-semibold" onClick={() => picker.current?.click()}>
                      <Film size={18} /> {hasVideo ? u("Videoni almashtirish") : u("Video tanlash")}
                    </button>
                    {hasVideo && <button className="min-h-[44px] px-2 text-[13px] text-clay" onClick={() => { setFile(null); setVideo(null); }}>{u("Olib tashlash")}</button>}
                  </div>
                  <p className="mt-2 text-[12px] text-muted">
                    {checking ? u("Video tekshirilmoqda...") : file ? `${file.name} · ${mb(file.size)} MB` : video ? u("Hozirgi video saqlanadi.") : u("MP4, vertikal 9:16, 720p, 10–20 soniya, 5–8 MB tavsiya etiladi.")}
                  </p>
                  {file && file.size > 15 * 1024 * 1024 && <p className="mt-1 text-[12px] text-clay">{u("Fayl katta: trafik tez tugaydi. Siqib yuklash tavsiya etiladi.")}</p>}
                  {progress !== null && (
                    <div className="mt-2 h-1.5 rounded-full bg-sand" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-1.5 rounded-full bg-clay" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  {fileWarn && !fileError && <p role="status" className="mt-2 text-[13px] text-muted">{fileWarn}</p>}
                  {fileError && <p role="alert" className="mt-2 text-[13px] text-clay">{u(fileError)}</p>}
                </div>
                {!hasVideo && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label={u("Fon rangi")}>
                    {TONES.map(([t, label]) => <button key={t} className={chip(tone === t)} aria-pressed={tone === t} onClick={() => setTone(t)}>{u(label)}</button>)}
                  </div>
                )}
              </>
            )}

            {!edit && (
              <label className="flex min-h-[44px] items-center gap-2 text-[13px] text-muted">
                <input type="checkbox" checked={already} onChange={(e) => setAlready(e.target.checked)} className="h-5 w-5" />
                {u("Matn allaqachon yangi alifboda (o‘girmasin)")}
              </label>
            )}

            {changed && (
              <div className="rounded-2xl bg-sand p-3 text-[14px]" aria-live="polite">
                <span className="text-[12px] text-muted">{u("Yangi alifboda joylanadi:")}</span>
                <p className="mt-1 whitespace-pre-wrap font-serif text-[15px]">{conv(body)}</p>
              </div>
            )}
          </div>

          <div className="border-t border-line p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
            <p className="mb-2 flex items-center justify-between text-[12px] text-muted" aria-live="polite">
              <span>{kind === "thought" ? `${words} ${u("so‘z")} · ${minutes} ${u("daqiqa o‘qish")}` : "\u00a0"}</span>
              {!validAll && missing.length > 0 && <span>{u("Yetishmaydi")}: {missing.map((m) => u(m)).join(", ")}</span>}
            </p>
            <button className="min-h-[52px] w-full rounded-full bg-clay text-[16px] font-bold text-onclay disabled:opacity-50" disabled={!validAll || busy || checking} onClick={submit}>
              {busy && progress !== null ? `${u("Yuklanmoqda")} ${progress}%` : edit ? u("Saqlash") : u("Joylash")}
            </button>
          </div>
        </div>
      </motion.div>
      {previewing && (
        <div className="fixed inset-0 z-[60]">
          <Reader t={previewThought} onClose={() => setPreviewing(false)} />
        </div>
      )}
    </>
  );
}
