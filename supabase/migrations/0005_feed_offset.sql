-- Lenta sahifalash: p_offset qo‘shildi (30 tadan keyingi fikrlarni "Yana ko‘rsatish" bilan yuklash uchun).
-- Eski chaqiruvlar (p_offset'siz) ishlashda davom etadi. Qayta ishga tushirish xavfsiz.
drop function if exists public.feed(text, text, int);
create function public.feed(p_category text default null, p_q text default null, p_limit int default 30, p_offset int default 0)
returns table (id bigint, category text, title text, body text, read_minutes int, created_at timestamptz, likes bigint, liked boolean, saved boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.category, t.title, t.body, t.read_minutes, t.created_at,
    (select count(*) from thought_likes l where l.thought_id = t.id),
    exists (select 1 from thought_likes l where l.thought_id = t.id and l.user_id = auth.uid()),
    exists (select 1 from thought_saves s where s.thought_id = t.id and s.user_id = auth.uid())
  from thoughts t
  where t.published
    and auth.uid() is not null
    and (p_category is null or t.category = p_category)
    and (p_q is null or p_q = '' or fold(t.title || ' ' || t.body) like '%' || fold(p_q) || '%')
  order by t.created_at desc, t.id desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0)
$$;
grant execute on function public.feed to authenticated;
