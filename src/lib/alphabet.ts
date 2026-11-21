/**
 * O‘zbek lotin alifbosi: eski (O‘ G‘ Sh Ch) ↔ yangi (Ö Ğ Ş Ç).
 * Qonun (2026-yil 21-oktabr) 2027-yil 22-apreldan kuchga kiradi; "ng" harfi alohida harf bo‘lmaydi, tutuq belgisi (’) saqlanadi.
 *
 * Qoida: bazada matn YANGI alifboda (kanonik) saqlanadi, eski alifbo tanlansa ko‘rsatishda o‘giriladi.
 * Eskidan yangiga o‘tish ba’zi kam holatlarda ikki ma’noli bo‘lishi mumkin (s va h alohida harf bo‘lgan so‘zlar,
 * ular tutuq bilan "s’h" shaklida yozilsa, tegilmaydi).
 */

const APOS = /[‘’ʻʼ'`]/;
const OG = new RegExp(`([oOgG])${APOS.source}`, "g");
const UP = "A-ZÖĞŞÇ";

/** Eski alifbo → yangi alifbo. */
export function toNew(s: string): string {
  return s
    .replace(OG, (_, c: string) => ({ o: "ö", O: "Ö", g: "ğ", G: "Ğ" })[c]!)
    .replace(/[Ss][Hh]/g, (m) => (m[0] === "S" ? "Ş" : "ş"))
    .replace(/[Cc][Hh]/g, (m) => (m[0] === "C" ? "Ç" : "ç"));
}

/** Yangi alifbo → eski alifbo. */
export function toOld(s: string): string {
  return s
    .replace(/Ö/g, "O‘")
    .replace(/ö/g, "o‘")
    .replace(/Ğ/g, "G‘")
    .replace(/ğ/g, "g‘")
    .replace(new RegExp(`Ş(?=[${UP}])`, "g"), "SH")
    .replace(/Ş/g, "Sh")
    .replace(/ş/g, "sh")
    .replace(new RegExp(`Ç(?=[${UP}])`, "g"), "CH")
    .replace(/Ç/g, "Ch")
    .replace(/ç/g, "ch");
}

/**
 * Qidiruv uchun "tekislash": eski va yangi yozuv bir xil ko‘rinishga keladi.
 * SQL'dagi public.fold() bilan bir xil mantiq (supabase/migrations/0001_init.sql).
 */
export function foldForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/ö/g, "o")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[ʻʼ‘’'`]/g, "")
    .replace(/sh/g, "s")
    .replace(/ch/g, "c");
}
