-- Bir güne birden fazla plan (ör. Yürüyüş + Üst A). Satırı olmayan gün "atanmamış".
create table public.day_schedule_items (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  position int not null default 0,
  kind text not null check (kind in ('workout','walk','rest')),
  template_id bigint references public.workout_templates on delete cascade,
  check ((kind = 'workout') = (template_id is not null))
);
create index on public.day_schedule_items (user_id, weekday);
create index on public.day_schedule_items (template_id);
alter table public.day_schedule_items enable row level security;
create policy "own rows" on public.day_schedule_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- mevcut tek-plan günlerini taşı (dinlenme günleri de korunur)
insert into public.day_schedule_items (user_id, weekday, position, kind, template_id)
select user_id, weekday, 0, kind, case when kind = 'workout' then template_id end
from public.day_schedule
where kind <> 'workout' or template_id is not null;
-- day_schedule şimdilik kalıyor: telefondaki v1.0.0 APK onu kullanıyor; v1.1.0 yayınlanınca silinecek.
