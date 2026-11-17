-- Günlük görev: yalnızca bu tarihte görünür (null = haftalık, weekdays'e göre her hafta)
alter table public.habits add column if not exists only_date date;
