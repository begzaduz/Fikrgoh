import { useRef, useState } from "react";
import { motion } from "framer-motion";
        import { Film, ImagePlus, Sparkles, X } from "lucide-react";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, aiSlides, uploadImage, uploadVideo, type Short } from "../lib/api";
import { toNew } from "../lib/alphabet";
import { canPlayVideo, inspectMp4 } from "../lib/video";
import { SlideEditor } from "./SlideEditor";
import { blankSlide, hasContent, mapText, slidesFromPlan, slidesText, type Slide } from "../lib/slides";
import { useApp, type ComposerState } from "../store";

const TONES: Array<[Short["tone"], string]> = [["sand", "Indigo"], ["sage", "Firuza"], ["ink", "Tun"], ["clay", "Tong"]];
const mb = (n: number) => (n / 1024 / 1024).toFixed(1);

/**
 * Admin uchun yozish oynasi: yangi fikr/short joylash yoki mavjudini tahrirlash, short uchun video yuklash.
 * Matn eski alifboda yozilsa, yangisiga (kanonik) avtomatik o‘giriladi. Tahrirlashda matn allaqachon yangi alifboda.
 */
export function Composer({ state, onClose }: { state: Exclude<ComposerState, null>; onClose: () => void }) {
  const { publish, u, c } = useApp();
  const edit = state.mode === "edit" ? state : null;
  const [kind, setKind] = useState<"thought" | "short">(edit?.kind ?? "thought");
  const [topic, setTopic] = useState(edit?.category ?? "");
  const [tone, setTone] = useState<Short["tone"]>(edit?.kind === "short" ? edit.tone : "sand");
  const [title, setTitle] = useState(edit?.kind === "thought" ? edit.title : "");
  const [body, setBody] = useState(edit ? (edit.kind === "thought" ? edit.body : edit.quote) : "");
  const [slides, setSlides] = useState<Slide[]>(edit?.kind === "short" && edit.slides?.length ? edit.slides : [blankSlide()]);
  const [classic, setClassic] = useState(edit?.kind === "short" && !edit.slides?.length);
  const slideMode = kind === "short" && !classic;
  const [already, setAlready] = useState(!!edit);
  const [video, setVideo] = useState<string | null>(edit?.kind === "short" ? edit.video_url : null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [fileWarn, setFileWarn] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
    const [aiText, setAiText] = useState("");
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
  const [image, setImage] = useState<string | null>(edit?.kind === "thought" ? edit.image_url ?? null : null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgError, setImgError] = useState("");
  const imgPicker = useRef<HTMLInputElement>(null);
  const preview = imgFile ? URL.createObjectURL(imgFile) : image;
  const pickImage = (f: File | undefined) => {
    setImgError("");
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setImgError("Faqat JPG, PNG yoki WebP rasm tanlang.");
    if (f.size > MAX_IMAGE_BYTES) return setImgError(`Rasm juda katta (${mb(f.size)} MB). Chegara: 5 MB.`);
    setImgFile(f);
  };

  const conv = (s: string) => (already ? s : toNew(s));
  const finalCategory = conv(topic.trim().toLowerCase());
  const hasVideo = !!file || !!video;
  const valid = kind === "thought" ? title.trim().length >= 3 && body.trim().length >= 20 : slideMode ? hasContent(slides) : body.trim().length >= 5 || hasVideo;
  const validAll = valid && topic.trim().length >= 2;
  const changed = !already && (conv(title) !== title || conv(body) !== body);

  const pick = async (f: File | undefined) => {
    setFileError("");
    setFileWarn("");
    if (!f) return;
    if (!f.type.startsWith("video/")) return setFileError("Faqat video fayl tanlang (MP4 tavsiya etiladi).");
    if (f.size > MAX_VIDEO_BYTES) return setFileError(`Fayl juda katta (${mb(f.size)} MB). Chegara: 50 MB.`);
    // Ochilmaydigan kodekli video bazaga tushib qolmasligi uchun yuklashdan oldin tekshiramiz.
    setChecking(true);
    const ok = await canPlayVideo(f);
    setChecking(false);
    if (!ok) return setFileError("Bu videoni ochib bo‘lmadi: kodek qo‘llab-quvvatlanmaydi. Uni H.264 + AAC kodekli MP4 qilib qayta eksport qiling.");
    // Qurilmaga bog‘liq bo‘lmagan tekshiruv: iPhone HEVC'ni ochadi, lekin boshqa qurilmalarda ochilmaydi.
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
      try {
        setProgress(0);
        url = await uploadVideo(file, setProgress);
      } catch (e) {
        setBusy(false);
        setProgress(null);
        return setFileError(`Video yuklanmadi: ${e instanceof Error ? e.message : "noma’lum xato"}`);
      }
    }
    let imgUrl = image;
    if (kind === "thought" && imgFile) {
      try {
        setProgress(0);
        imgUrl = await uploadImage(imgFile, setProgress);
      } catch (e) {
        setBusy(false);
        setProgress(null);
        return setImgError(`Rasm yuklanmadi: ${e instanceof Error ? e.message : "noma’lum xato"}`);
      }
    }
    const id = edit?.id;
    const ok = await publish(
      kind === "thought"
        ? { kind, id, category: finalCategory, title: conv(title.trim()), body: conv(body.trim()), imageUrl: imgUrl, oldImageUrl: edit?.kind === "thought" ? edit.image_url ?? null : null }
        : slideMode
          ? { kind, id, category: finalCategory, quote: conv(slidesText(slides)).slice(0, 280), tone, videoUrl: null, oldVideoUrl: edit?.kind === "short" ? edit.video_url : null, slides: mapText(slides, conv), oldSlides: edit?.kind === "short" ? edit.slides : null }
          : { kind, id, category: finalCategory, quote: conv(body.trim()), tone, videoUrl: url, oldVideoUrl: edit?.kind === "short" ? edit.video_url : null, slides: null, oldSlides: edit?.kind === "short" ? edit.slides : null },
    );
    setBusy(false);
    setProgress(null);
    if (ok) onClose();
  };

  const chip = (on: boolean) => `min-h-[40px] rounded-full border px-4 text-[13px] font-semibold ${on ? "border-clay bg-clay text-onclay" : "border-line text-muted"}`;
  const field = "w-full rounded-2xl border border-line bg-sand p-3 text-base text-ink placeholder:text-muted";

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-center bg-paper" role="dialog" aria-modal="true" aria-label={edit ? u("Tahrirlash") : u("Yangi fikr")}
      initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
      <div className="flex h-full w-full max-w-[560px] flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 pb-2 pt-[calc(8px+var(--safe-top))]">
          <h2 className="text-[26px] font-semibold leading-none">{edit ? u("Tahrirlash") : u("Yangi")}</h2>
          <button className="flex min-h-[44px] min-w-[44px] items-center justify-center" onClick={onClose} aria-label={u("Yopish")}><X size={22} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!edit && (
            <div className="flex gap-2" role="group" aria-label={u("Turi")}>
              <button className={chip(kind === "thought")} aria-pressed={kind === "thought"} onClick={() => setKind("thought")}>{u("Fikr")}</button>
              <button className={chip(kind === "short")} aria-pressed={kind === "short"} onClick={() => setKind("short")}>Short</button>
            </div>
          )}

          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={30} aria-label={u("Mavzu")} placeholder={u("Mavzu (masalan: Sport)")} className={field} />

          {kind === "thought" && (
            <div className="rounded-2xl border border-line p-3">
              <input ref={imgPicker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={u("Rasm tanlash")}
                onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
              <div className="flex items-center gap-3">
                <button className="flex min-h-[44px] items-center gap-2 rounded-xl bg-sand px-4 text-[13px] font-semibold" onClick={() => imgPicker.current?.click()}>
                  <ImagePlus size={18} /> {preview ? u("Rasmni almashtirish") : u("Rasm tanlash")}
                </button>
                {preview && <button className="min-h-[44px] px-2 text-[13px] text-clay" onClick={() => { setImgFile(null); setImage(null); }}>{u("Olib tashlash")}</button>}
              </div>
              {preview && <img src={preview} alt="" className="mt-3 h-36 w-full rounded-xl object-cover" />}
              <p className="mt-2 text-[12px] text-muted">{u("Ixtiyoriy. Qorong‘i, tumanli rasm yaxshi chiqadi (JPG/PNG/WebP, 5 MB gacha).")}</p>
              {imgError && <p role="alert" className="mt-1 text-[13px] text-clay">{u(imgError)}</p>}
            </div>
          )}

          {kind === "thought" && (
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} aria-label={u("Sarlavha")} placeholder={u("Sarlavha")} className={field} />
          )}
          {kind === "short" && (
            <div className="flex gap-2" role="group" aria-label={u("Short turi")}>
              <button className={chip(!classic)} aria-pressed={!classic} onClick={() => setClassic(false)}>{u("Slaydlar")}</button>
              <button className={chip(classic)} aria-pressed={classic} onClick={() => setClassic(true)}>{u("Matn / video")}</button>
            </div>
          )}
          {slideMode && <SlideEditor slides={slides} onChange={setSlides} u={u} c={c} />}
          {!slideMode && <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={kind === "thought" ? 8000 : 280}
            aria-label={kind === "thought" ? u("Matn") : u("Qisqa matn")}
            placeholder={kind === "thought" ? u("Matn (abzaslar orasiga bo‘sh qator qoldiring)") : u("Qisqa fikr yoki video izohi")}
            className={`${field} ${kind === "thought" ? "min-h-[220px]" : "min-h-[110px]"} resize-none`} />}

          {kind === "short" && !slideMode && (
            <>
              <div className="rounded-2xl border border-line p-3">
                <input ref={picker} type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" aria-label={u("Video tanlash")}
                  onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
                <div className="flex items-center gap-3">
                  <button className="flex min-h-[44px] items-center gap-2 rounded-xl bg-sand px-4 text-[13px] font-semibold" onClick={() => picker.current?.click()}>
                    <Film size={18} /> {hasVideo ? u("Videoni almashtirish") : u("Video tanlash")}
                  </button>
                  {hasVideo && (
                    <button className="min-h-[44px] px-2 text-[13px] text-clay" onClick={() => { setFile(null); setVideo(null); }}>{u("Olib tashlash")}</button>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  {checking ? u("Video tekshirilmoqda...") : file ? `${file.name} · ${mb(file.size)} MB` : video ? u("Hozirgi video saqlanadi.") : u("MP4, vertikal 9:16, 720p, 10–20 soniya, 5–8 MB tavsiya etiladi.")}
                </p>
                {file && file.size > 15 * 1024 * 1024 && (
                  <p className="mt-1 text-[12px] text-clay">{u("Fayl katta: trafik tez tugaydi. Siqib yuklash tavsiya etiladi.")}</p>
                )}
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

          {changed && !slideMode && (
            <div className="rounded-2xl bg-sand p-3 text-[14px]" aria-live="polite">
              <span className="text-[12px] text-muted">{u("Yangi alifboda joylanadi:")}</span>
              {kind === "thought" && <p className="mt-1 font-serif text-[17px] font-semibold">{conv(title)}</p>}
              <p className="mt-1 whitespace-pre-wrap font-serif text-[15px]">{conv(body)}</p>
            </div>
          )}
        </div>

        <div className="border-t border-line p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          <button className="min-h-[52px] w-full rounded-full bg-clay text-[16px] font-bold text-onclay disabled:opacity-50" disabled={!validAll || busy || checking} onClick={submit}>
            {busy && progress !== null ? `${u("Yuklanmoqda")} ${progress}%` : edit ? u("Saqlash") : u("Joylash")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
