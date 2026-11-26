-- Fikrgoh editorial content: asosiy fikrlar endi qisqa, maqola yoki slayd formatida bo‘lishi mumkin.
alter table public.thoughts
  add column if not exists format text not null default 'article',
  add column if not exists blocks jsonb,
  add column if not exists slides jsonb;

alter table public.thoughts drop constraint if exists thoughts_format_check;
alter table public.thoughts add constraint thoughts_format_check
  check (format in ('quick', 'article', 'slides'));

drop function if exists public.feed(text, text, int, int);
create function public.feed(p_category text default null, p_q text default null, p_limit int default 30, p_offset int default 0)
returns table (
  id bigint, category text, title text, body text, read_minutes int,
  created_at timestamptz, likes bigint, liked boolean, saved boolean,
  image_url text, format text, blocks jsonb, slides jsonb
)
language sql stable security definer set search_path = public as $$
  select t.id, t.category, t.title, t.body, t.read_minutes, t.created_at,
    (select count(*) from thought_likes l where l.thought_id = t.id),
    exists (select 1 from thought_likes l where l.thought_id = t.id and l.user_id = auth.uid()),
    exists (select 1 from thought_saves s where s.thought_id = t.id and s.user_id = auth.uid()),
    t.image_url, t.format, t.blocks, t.slides
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
