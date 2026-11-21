# Fikrnoma

Telegram Mini App: fikrlar lentasi, kunlik 5 savol, yumshoq streak, fikr darajasi, qisqa fikrlar (Shorts).
Matnlar **yangi o‘zbek lotin alifbosida** (Ö Ğ Ş Ç); foydalanuvchi sozlamalarda eski alifboga (O‘ G‘ Sh Ch) o‘tkaza oladi.

**Stek:** React + TypeScript + Vite, Tailwind, Framer Motion · Supabase (Postgres, RLS, Edge Functions). Alohida server kerak emas.

## Ishga tushirish

1. `cp .env.example .env` va `VITE_SUPABASE_ANON_KEY`ni yozing (Supabase → Project Settings → API). `service_role` kalitni hech qayerga qo‘ymang.
2. Supabase → SQL Editor: avval `supabase/migrations/0001_init.sql`, keyin `supabase/seed.sql` ni ishga tushiring.
3. Kirish funksiyasi (Supabase CLI bilan):
   ```
   supabase link --project-ref svihzrgndgnketairtog
   supabase secrets set TELEGRAM_BOT_TOKEN=... ADMIN_TELEGRAM_IDS=sizning_telegram_id
   supabase functions deploy telegram-auth
   ```
   Brauzerda sinash uchun vaqtincha `supabase secrets set DEV_AUTH=true` (ishlab chiqarishda **o‘chiring**: `supabase secrets unset DEV_AUTH`).
4. `npm install && npm run dev`.
5. Joylash: Vercel/Netlify (`npm run build`, `dist/`), keyin @BotFather → Mini App URL.

## Kontent qo‘shish
Hozircha Supabase → Table Editor → `thoughts` / `shorts` jadvallariga **yangi alifboda** yoziladi (`category`: fikr | mindset | madaniyat).
Eski alifboda yozilgan matnni o‘girish uchun `src/lib/alphabet.ts: toNew()`.

## Tekshiruvlar
- `npm test` — alifbo o‘girgichi (5 test).
- SQL sxema va xavfsizlik qoidalari Postgres 16'da sinalgan (RLS, qidiruv, ball, streak).
- **Sinalmagan:** Edge Function (haqiqiy Supabase va Telegram'da), interfeys brauzerda.

## Alifbo haqida
Qonun 2027-yil 22-apreldan kuchga kiradi. Bazada matn yangi alifboda saqlanadi; eskiga o‘girish deterministik (ö→o‘, ş→sh…).
Eskidan yangiga o‘girishda s va h alohida harf bo‘lgan kam so‘zlar xato chiqishi mumkin — ularni tutuq bilan (s’h) yozing.
