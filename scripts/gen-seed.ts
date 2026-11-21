// Namunaviy ma’lumotlarni ESKI alifboda yozib, YANGI (kanonik) alifboga o‘girib supabase/seed.sql ni yaratadi.
import { writeFileSync } from "node:fs";
import { toNew } from "../src/lib/alphabet.js";

const q = (s: string) => `'${toNew(s).replace(/'/g, "''")}'`;

const questions = [
  "Bugun nimani to‘xtatmay o‘ylayapsan?", "Oxirgi marta nimadan ilhomlanding?", "Qaysi odating seni ushlab turibdi?",
  "Eslab qolishga arziydigan bir lahzani yoz.", "Bugun kim bilan haqiqiy suhbat qilding?", "Qaysi fikringdan hozir ham qaytmaysan?",
  "Bir yil oldingi o‘zingga nima deb aytar eding?", "Seni nima tinchlantiradi?", "Hozir nimadan qo‘rqayapsan, lekin buni aytmayapsan?",
  "Qaysi kitob, film yoki qo‘shiq seni o‘zgartirgan?", "Bugun nimani yo‘qotding yoki nimadan voz kechding?", "Qaysi ishni o‘zing uchun qilding, hech kim uchun emas?",
  "Muvaffaqiyat sen uchun nima degani?", "Kimdan nimani o‘rgandingki, u buni bilmaydi?", "Nimani endi kechiktirmaslik kerak?",
  "Bugun qaysi odatingni kuzatding?", "Kamroq shovqin bo‘lsa, nimani eshitar eding?", "Qaysi savolga hali javobing yo‘q?",
  "Odamlar seni nima uchun yaxshi ko‘rishini o‘ylaysanmi?", "Bugungi kuningni bitta jumla bilan ayt.", "Qaysi qarashing so‘nggi yilda o‘zgardi?",
];

const thoughts = [
  { c: "fikr", t: "Ba’zan to‘g‘ri savol — javobdan muhimroq.", m: 1,
    b: "Biz javoblarni izlashga shoshilamiz. Chunki javob aniq, o‘lchash mumkin va ko‘pincha xotirjamlik beradi. Savol esa aksincha — fikrimizni bezovta qiladi.\n\nLekin rivojlanish ko‘pincha tayyor javobdan emas, to‘g‘ri qo‘yilgan savoldan boshlanadi. Savol biz ko‘rmayotgan jihatni ochadi.\n\nBalki ba’zan javob topishdan oldin, nimani so‘rayotganimizni aniqlab olishimiz kerakdir." },
  { c: "mindset", t: "Kamroq shovqin — ko‘proq mazmun.", m: 1,
    b: "Har kuni bizga minglab xabarlar, fikrlar va tasvirlar yetib keladi. Ularning barchasiga munosabat bildirishga urinish ichki ovozimizni eshitishni qiyinlashtiradi.\n\nSukut — hech narsa bo‘lmayotgan vaqt emas. U fikrlar joyiga tushadigan makon bo‘lishi mumkin." },
  { c: "madaniyat", t: "Kitob o‘qiganda biz muallifni emas, o‘zimizni o‘qiymiz.", m: 2,
    b: "Bir xil sahifani ikki kishi o‘qisa, ikki xil kitob o‘qiydi. Chunki har kim sahifaga o‘z tajribasini olib keladi.\n\nShuning uchun yaxshi kitob javob bermaydi, balki bizdagi savollarni uyg‘otadi." },
  { c: "fikr", t: "Baxt — bu orzu emas, holatdir.", m: 1,
    b: "Baxt ko‘pincha katta maqsadlar bilan bog‘lanadi. Go‘yoki biror narsaga erishsak, keyin hammasi yaxshi bo‘ladigandek.\n\nAmmo baxt ba’zan oddiy lahzada, yaqin inson bilan suhbatda yoki o‘zimizni anglashda namoyon bo‘ladi." },
];

const shorts = [
  { c: "fikr", tone: "sand", t: "Ko‘p narsani bilish — dono bo‘lish degani emas. Muhimi, bilganing haqida qanday fikrlashing." },
  { c: "madaniyat", tone: "sage", t: "Shahar — xaritadagi ko‘chalar emas. U odamlar bir-biriga qanchalik yaqin yashashidir." },
  { c: "mindset", tone: "ink", t: "Ba’zan oldinga yurish uchun tezlashish emas, nimaga shoshilayotganingni anglash kerak." },
];

const out = [
  "-- Avtomatik yaratilgan: npm run seed (scripts/gen-seed.ts). Qo‘lda tahrirlamang.",
  "insert into public.daily_questions (id, text) values",
  questions.map((x, i) => `  (${i + 1}, ${q(x)})`).join(",\n") + "\non conflict (id) do update set text = excluded.text;",
  "",
  "insert into public.thoughts (category, title, body, read_minutes) values",
  thoughts.map((x) => `  ('${x.c}', ${q(x.t)}, ${q(x.b)}, ${x.m})`).join(",\n") + ";",
  "",
  "insert into public.shorts (category, quote, tone, position) values",
  shorts.map((x, i) => `  ('${x.c}', ${q(x.t)}, '${x.tone}', ${i})`).join(",\n") + ";",
  "",
].join("\n");

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out);
console.log("supabase/seed.sql yaratildi");
