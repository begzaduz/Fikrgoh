-- Shorts uchun yoqtirish: soni hamma ko‘radi, kim yoqtirgani esa faqat o‘ziga ma’lum.
create table if not exists public.short_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  short_id bigint not null references public.shorts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, short_id)
);
alter table public.short_likes enable row level security;
drop policy if exists short_likes_own on public.short_likes;
create policy short_likes_own on public.short_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.short_likes_summary()
returns table (short_id bigint, likes bigint, liked boolean)
language sql stable security definer set search_path = public as $$
  select s.id,
    (select count(*) from short_likes l where l.short_id = s.id),
    exists (select 1 from short_likes l where l.short_id = s.id and l.user_id = auth.uid())
  from shorts s
  where s.published and auth.uid() is not null
$$;
grant execute on function public.short_likes_summary to authenticated;
