-- Admin huquqi bazaning o‘zida: bu Telegram ID har doim admin bo‘ladi (Edge Function secret'iga bog‘liq emas).
-- Boshqa kishini admin qilish uchun ID'ni shu yerda o‘zgartiring/qo‘shing va qayta ishga tushiring.
create or replace function public.force_admin() returns trigger
language plpgsql as $$
begin
  if new.telegram_id = 1282050618 then
    new.role := 'admin';
  end if;
  return new;
end $$;

drop trigger if exists profiles_force_admin on public.profiles;
create trigger profiles_force_admin
  before insert or update on public.profiles
  for each row execute function public.force_admin();

update public.profiles set role = 'admin' where telegram_id = 1282050618;
