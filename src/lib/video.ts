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

export type Mp4Info = { codec: "h264" | "hevc" | "av1" | "other" | null; faststart: boolean | null };

const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));
const MAX_MOOV = 16 * 1024 * 1024;

/**
 * MP4 faylning o‘zidan (qurilmaga bog‘liq bo‘lmagan holda) kodekni va "faststart" holatini aniqlaydi.
 * - codec: H.264 (avc1) hamma joyda ochiladi; HEVC (hvc1/hev1) ko‘p Android va Telegram Desktop'da ochilmaydi.
 * - faststart: moov bloki mdat'dan oldin bo‘lsa true. Aks holda video boshlanishi sekin yoki umuman boshlanmasligi mumkin.
 * MP4/MOV bo‘lmasa yoki o‘qib bo‘lmasa, {codec:null, faststart:null} qaytaradi (rad etmaymiz).
 */
export async function inspectMp4(file: Blob): Promise<Mp4Info> {
  const unknown: Mp4Info = { codec: null, faststart: null };
  try {
    let off = 0;
    let sawMdat = false;
    for (let i = 0; i < 64 && off + 8 <= file.size; i++) {
      const head = new Uint8Array(await file.slice(off, off + 16).arrayBuffer());
      const dv = new DataView(head.buffer);
      const type = ascii(head, 4, 4);
      let size = dv.getUint32(0);
      if (i === 0 && type !== "ftyp") return unknown;
      if (size === 1 && head.length >= 16) size = Number(dv.getBigUint64(8));
      else if (size === 0) size = file.size - off;
      if (size < 8) return unknown;
      if (type === "mdat") sawMdat = true;
      if (type === "moov") {
        if (size > MAX_MOOV) return { codec: null, faststart: !sawMdat };
        const moov = new Uint8Array(await file.slice(off, off + size).arrayBuffer());
        const txt = ascii(moov, 0, moov.length);
        const codec = /hvc1|hev1/.test(txt) ? "hevc" : /avc1|avc3/.test(txt) ? "h264" : /av01/.test(txt) ? "av1" : "other";
        return { codec, faststart: !sawMdat };
      }
      off += size;
    }
  } catch {
    /* o‘qib bo‘lmadi: rad etmaymiz */
  }
  return unknown;
}
