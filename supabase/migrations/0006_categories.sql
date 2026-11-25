-- Yo'nalish endi faqat 3 ta emas: admin boshqa mavzuni ham yoza oladi (matn, 2–30 belgi).
alter table public.thoughts drop constraint if exists thoughts_category_check;
alter table public.shorts   drop constraint if exists shorts_category_check;
alter table public.thoughts add constraint thoughts_category_check check (char_length(btrim(category)) between 2 and 30);
alter table public.shorts   add constraint shorts_category_check   check (char_length(btrim(category)) between 2 and 30);
