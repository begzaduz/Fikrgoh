-- Fikrnoma: baza sxemasi, xavfsizlik qoidalari (RLS) va funksiyalar.
-- Matnlar KANONIK (yangi) alifboda saqlanadi: Ö Ğ Ş Ç.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_id bigint unique not null,
  first_name text not null,
  username text,
  role text not null default 'reader' check (role in ('reader', 'admin')),
  alphabet text not null default 'new' check (alphabet in ('new', 'old')),
  created_at timestamptz not null default now()
);

create table public.thoughts (
  id bigint generated always as identity primary key,
  author_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('fikr', 'mindset', 'madaniyat')),
  title text not null,
  body text not null,
  read_minutes int not null default 1,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index thoughts_created_idx on public.thoughts (created_at desc);

create table public.thought_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  thought_id bigint not null references public.thoughts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thought_id)
);
create table public.thought_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  thought_id bigint not null references public.thoughts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thought_id)
);

create table public.shorts (
  id bigint generated always as identity primary key,
  category text not null check (category in ('fikr', 'mindset', 'madaniyat')),
  quote text not null,
  tone text not null default 'sand' check (tone in ('sand', 'sage', 'ink', 'clay')),
  position int not null default 0,
  published boolean not null default true
);

create table public.daily_questions (
  id int primary key,
  text text not null
);

-- Kunlik javoblar: faqat egasiga ko‘rinadi.
create table public.daily_answers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  idx int not null check (idx between 0 and 4),
  question text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  primary key (user_id, day, idx)
);

-- ---------- Yordamchi funksiyalar ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Qidiruv uchun tekislash: eski va yangi yozuv bir xil ko‘rinishga keladi (src/lib/alphabet.ts: foldForSearch bilan bir xil).
create function public.fold(t text) returns text
language sql immutable as $$
  select replace(replace(translate(lower(t), 'öğşçʻʼ‘’''`', 'ogsc'), 'sh', 's'), 'ch', 'c')
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.thoughts enable row level security;
alter table public.thought_likes enable row level security;
alter table public.thought_saves enable row level security;
alter table public.shorts enable row level security;
alter table public.daily_questions enable row level security;
alter table public.daily_answers enable row level security;

create policy profiles_own_read on public.profiles for select to authenticated using (id = auth.uid());
-- Foydalanuvchi faqat alifbo sozlamasini o‘zgartira oladi (role'ni emas).
revoke update on public.profiles from authenticated;
grant update (alphabet) on public.profiles to authenticated;
create policy profiles_own_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy thoughts_read on public.thoughts for select to authenticated using (published or public.is_admin());
create policy thoughts_admin_write on public.thoughts for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy likes_own on public.thought_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saves_own on public.thought_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy shorts_read on public.shorts for select to authenticated using (published or public.is_admin());
create policy shorts_admin_write on public.shorts for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy dq_read on public.daily_questions for select to authenticated using (true);
create policy answers_own on public.daily_answers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Fikrlar lentasi ----------
-- security definer: yoqtirishlar sonini hamma ko‘rsin, lekin kim yoqtirganini emas.
create function public.feed(p_category text default null, p_q text default null, p_limit int default 30)
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
  order by t.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- ---------- Kunlik 5 savol ----------
create function public.daily_question(p_day date, p_idx int) returns text
language sql stable set search_path = public as $$
  select text from daily_questions
  where id = (((p_day - date '1970-01-01') * 5 + p_idx) % (select count(*) from daily_questions)) + 1
$$;

create function public.get_daily() returns jsonb
language plpgsql stable set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Tashkent')::date;
  v_cursor date;
  v_streak int := 0;
  v_points int;
  v_done int;
  v_questions jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select jsonb_agg(jsonb_build_object('index', g, 'text', daily_question(v_day, g), 'answer', a.body) order by g)
    into v_questions
  from generate_series(0, 4) g
  left join daily_answers a on a.user_id = v_uid and a.day = v_day and a.idx = g;

  select count(*) into v_done from daily_answers where user_id = v_uid and day = v_day;

  -- Yumshoq streak: bugun hali javob bo‘lmasa, kechagi kundan sanaladi.
  v_cursor := case when v_done > 0 then v_day else v_day - 1 end;
  while exists (select 1 from daily_answers where user_id = v_uid and day = v_cursor) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  -- Ball: javob +10, saqlash +3, yoqtirish +1.
  select (select count(*) from daily_answers where user_id = v_uid) * 10
       + (select count(*) from thought_saves where user_id = v_uid) * 3
       + (select count(*) from thought_likes where user_id = v_uid)
    into v_points;

  return jsonb_build_object(
    'day', v_day, 'questions', v_questions, 'done', v_done, 'streak', v_streak, 'points', v_points,
    'level', case when v_points >= 300 then 2 when v_points >= 100 then 1 else 0 end,
    'levelFrom', case when v_points >= 300 then 300 when v_points >= 100 then 100 else 0 end,
    'levelTo', case when v_points >= 300 then 600 when v_points >= 100 then 300 else 100 end
  );
end $$;

create function public.save_answer(p_idx int, p_body text) returns jsonb
language plpgsql set search_path = public as $$
declare v_day date := (now() at time zone 'Asia/Tashkent')::date;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_idx not between 0 and 4 then raise exception 'bad index'; end if;
  if char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'bad length'; end if;
  insert into daily_answers (user_id, day, idx, question, body)
  values (auth.uid(), v_day, p_idx, daily_question(v_day, p_idx), btrim(p_body))
  on conflict (user_id, day, idx) do update set body = excluded.body;
  return get_daily();
end $$;

grant execute on function public.feed, public.get_daily, public.save_answer, public.daily_question, public.fold, public.is_admin to authenticated;
