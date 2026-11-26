-- Short slaydlari: har bir short bir nechta slayddan iborat bo‘lishi mumkin (jsonb, src/lib/slides.ts). Qayta ishga tushirish xavfsiz.
alter table public.shorts add column if not exists slides jsonb;
