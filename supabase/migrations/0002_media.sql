-- Video yuklash: shorts jadvaliga video havolasi va Storage bucket (faqat admin yuklaydi, hamma ko‘radi).

alter table public.shorts add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shorts-media', 'shorts-media', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = excluded.allowed_mime_types;

-- Ochiq bucket: fayllar havola orqali hamma uchun o‘qiladi. Yozish, almashtirish va o‘chirish faqat adminga.
drop policy if exists shorts_media_admin_insert on storage.objects;
create policy shorts_media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'shorts-media' and public.is_admin());
drop policy if exists shorts_media_admin_update on storage.objects;
create policy shorts_media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'shorts-media' and public.is_admin()) with check (bucket_id = 'shorts-media' and public.is_admin());
drop policy if exists shorts_media_admin_delete on storage.objects;
create policy shorts_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'shorts-media' and public.is_admin());
