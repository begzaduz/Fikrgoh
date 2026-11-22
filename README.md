# Fikrnoma

Telegram Mini App: fikrlar lentasi, qisqa fikrlar (Shorts), profil (o‘qilgan fikrlar, ketma-ket kunlar, haftalik iz, unvon, belgilar). Kunlik savollar vaqtincha olib tashlangan (baza va SQL saqlangan).
Matnlar **yangi o‘zbek lotin alifbosida** (Ö Ğ Ş Ç); foydalanuvchi sozlamalarda eski alifboga (O‘ G‘ Sh Ch) o‘tkaza oladi.

**Stek:** React + TypeScript + Vite, Tailwind, Framer Motion · Supabase (Postgres, RLS, Edge Functions). Alohida server kerak emas.

## Ishga tushirish

1. `cp .env.example .env` va `VITE_SUPABASE_ANON_KEY`ni yozing (Supabase → Project Settings → API). `service_role` kalitni hech qayerga qo‘ymang.
2. Supabase → SQL Editor: avval `supabase/migrations/0001_init.sql`, keyin `0002_media.sql`, `0003_admin.sql` (admin Telegram ID'ni shu fayl ichida o‘zgartiring), oxirida `supabase/seed.sql` ni ishga tushiring.
3. Kirish funksiyasi (Supabase CLI bilan):
   ```
   supabase link --project-ref svihzrgndgnketairtog
   supabase secrets set TELEGRAM_BOT_TOKEN=... ADMIN_TELEGRAM_IDS=sizning_telegram_id
   supabase functions deploy swift-processor
   ```
   Brauzerda sinash uchun vaqtincha `supabase secrets set DEV_AUTH=true` (ishlab chiqarishda **o‘chiring**: `supabase secrets unset DEV_AUTH`).
4. `npm install && npm run dev`.
5. Joylash: Vercel/Netlify (`npm run build`, `dist/`), keyin @BotFather → Mini App URL.

## Kontent qo‘shish
Admin (ADMIN_TELEGRAM_IDS ichidagi Telegram akkaunt) ilovaning o‘zida yozadi: Bosh sahifa yoki Shorts'dagi **+** tugmasi → Fikr yoki Short, yo‘nalish, matn.
Shu yerdan tahrirlash va o‘chirish ham mumkin (kartadagi **⋯** menyusi). Short uchun video yuklanadi (MP4, 50 MB gacha; `0002_media.sql` ni bir marta ishga tushiring). Video yuklashdan oldin qurilmada ochilishi tekshiriladi; kodek qo‘llab-quvvatlanmasa (masalan, HEVC/H.265), **H.264 + AAC** kodekli MP4 qilib qayta eksport qilish so‘raladi. Video ochilmasa, ilova o‘z proksisi (`/sb`) orqali ham urinib ko‘radi.
Matn eski alifboda yozilsa, avtomatik yangi alifboga o‘giriladi (ko‘rib chiqish oynasi bor). Oddiy foydalanuvchilarga tugma ko‘rinmaydi va baza ham ularga yozishga ruxsat bermaydi (RLS).
Zaxira yo‘l: Supabase → Table Editor → `thoughts` / `shorts` (matn yangi alifboda yoziladi).

## Tekshiruvlar
- `npm test` — alifbo o‘girgichi (5 test). `npm run test:ui` — kirish, kunlik savollar, admin yozishi, video tekshiruvi (soxta Telegram/Supabase bilan).
- SQL sxema va xavfsizlik qoidalari Postgres 16'da sinalgan (RLS, qidiruv, ball, streak).
- Ilova Telegram ichida ishlaydi (kirish, admin yozishi). **Real telefonda sinalmagan:** video ijrosi (mobil internet, turli kodeklar) va `/sb` proksi orqali zaxira yo‘li.

## Alifbo haqida
Qonun 2027-yil 22-apreldan kuchga kiradi. Bazada matn yangi alifboda saqlanadi; eskiga o‘girish deterministik (ö→o‘, ş→sh…).
Eskidan yangiga o‘girishda s va h alohida harf bo‘lgan kam so‘zlar xato chiqishi mumkin — ularni tutuq bilan (s’h) yozing.
