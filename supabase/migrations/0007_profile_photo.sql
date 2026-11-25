-- Telegram profil rasmi (havola). Kirish funksiyasi har kirishda yangilaydi.
alter table public.profiles add column if not exists photo_url text;
