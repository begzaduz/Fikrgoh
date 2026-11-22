-- Profil: o‘qilgan fikrlar, ketma-ket kunlar, haftalik iz va unvon (XP yo‘q — faqat o‘qish odati).
-- Kun Toshkent vaqti bo‘yicha. Har bir o‘qish (foydalanuvchi, fikr, kun) bir marta yoziladi.

create table if not exists public.thought_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  thought_id bigint not null references public.thoughts(id) on delete cascade,
  day date not null,
  primary key (user_id, thought_id, day)
);
alter table public.thought_reads enable row level security;
drop policy if exists reads_own on public.thought_reads;
create policy reads_own on public.thought_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.record_read(p_thought_id bigint) returns void
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into thought_reads (user_id, thought_id, day)
  values (auth.uid(), p_thought_id, (now() at time zone 'Asia/Tashkent')::date)
  on conflict do nothing;
end $$;

create or replace function public.get_stats() returns jsonb
language plpgsql stable set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Tashkent')::date;
  v_today boolean;
  v_cursor date;
  v_streak int := 0;
  v_reads int;
  v_cats int;
  v_week jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select count(distinct thought_id) into v_reads from thought_reads where user_id = v_uid;
  select count(distinct t.category) into v_cats
    from thought_reads r join thoughts t on t.id = r.thought_id where r.user_id = v_uid;
  select exists (select 1 from thought_reads where user_id = v_uid and day = v_day) into v_today;

  -- Yumshoq streak: bugun hali o‘qilmagan bo‘lsa, kechagi kundan sanaladi.
  v_cursor := case when v_today then v_day else v_day - 1 end;
  while exists (select 1 from thought_reads where user_id = v_uid and day = v_cursor) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  -- Joriy hafta (dushanbadan yakshanbagacha): har kun uchun o‘qilganmi.
  select jsonb_agg(exists (select 1 from thought_reads where user_id = v_uid and day = d::date) order by d)
    into v_week
  from generate_series(date_trunc('week', v_day::timestamp), date_trunc('week', v_day::timestamp) + interval '6 days', interval '1 day') d;

  return jsonb_build_object(
    'reads', v_reads, 'categories', v_cats, 'streak', v_streak, 'today', v_today, 'week', v_week,
    'todayIndex', extract(isodow from v_day)::int - 1,
    'level', case when v_reads >= 15 then 2 when v_reads >= 5 then 1 else 0 end,
    'levelTo', case when v_reads >= 15 then null when v_reads >= 5 then 15 else 5 end
  );
end $$;

grant execute on function public.record_read, public.get_stats to authenticated;
