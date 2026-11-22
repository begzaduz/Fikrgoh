/**
 * Tanlangan video shu qurilmada ochilishini tekshiradi.
 * Kodek qo‘llab-quvvatlanmasa (masalan, HEVC/H.265), brauzer xato beradi yoki tasvirsiz (faqat ovoz) ochadi.
 * Natija aniq bo‘lmasa (8 soniyada javob kelmasa) videoni rad etmaymiz.
 * Eslatma: bu faqat shu qurilmani tekshiradi; shuning uchun H.264 + AAC (MP4) tavsiya etiladi.
 */
export function canPlayVideo(file: File, timeoutMs = 8000): Promise<boolean> {
  if (typeof URL.createObjectURL !== "function") return Promise.resolve(true);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      v.onloadeddata = null;
      v.onerror = null;
      v.removeAttribute("src");
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(true), timeoutMs);
    v.muted = true;
    v.preload = "metadata";
    v.onloadeddata = () => finish(v.videoWidth > 0);
    v.onerror = () => finish(false);
    v.src = url;
  });
}
