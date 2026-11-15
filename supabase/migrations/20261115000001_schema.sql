-- MVM kullanıcı verisi. Hareket kataloğu, kaslar ve hazır yiyecekler uygulamayla gelir (src/data); burada sadece kullanıcının ürettikleri var.
-- Her tabloda user_id = auth.uid() ile RLS: her kullanıcı yalnızca kendi satırlarını görür/yazar.
-- Tarihler yerel takvim günü (date), zaman damgaları timestamptz. Ağırlık kg, su ml, adım adet.

create table public.user_exercises (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name_tr text not null,
  equipment text not null,
  mode text not null default 'reps' check (mode in ('reps','time')),
  description text,
  photo_uri text,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.exercise_favorites (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  exercise_id text not null,
  primary key (user_id, exercise_id)
);

create table public.workout_templates (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  notes text
);

create table public.template_exercises (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  template_id bigint not null references public.workout_templates on delete cascade,
  exercise_id text not null,
  position int not null,
  sets int not null,
  rep_min int,
  rep_max int,
  duration_sec int,
  rest_sec int,
  per_side boolean not null default false,
  superset_group int
);
create index on public.template_exercises (template_id, position);

create table public.day_schedule (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  kind text not null check (kind in ('workout','rest','walk')),
  template_id bigint references public.workout_templates on delete set null,
  primary key (user_id, weekday)
);
create index on public.day_schedule (template_id);

create table public.workout_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  template_id bigint references public.workout_templates on delete set null,
  date date not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null check (status in ('active','done','abandoned'))
);
create index on public.workout_sessions (user_id, date);
create index on public.workout_sessions (template_id);

create table public.session_sets (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id bigint not null references public.workout_sessions on delete cascade,
  exercise_id text not null,
  set_index int not null,
  weight_kg real,
  reps int,
  duration_sec int,
  completed_at timestamptz not null default now(),
  unique (session_id, exercise_id, set_index)
);
create index on public.session_sets (user_id, exercise_id);

create table public.habits (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  icon text not null,
  weekdays int not null default 127,
  position int not null,
  archived_at timestamptz
);
create index on public.habits (user_id);

create table public.habit_logs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id bigint not null references public.habits on delete cascade,
  date date not null,
  primary key (habit_id, date)
);
create index on public.habit_logs (user_id, date);

create table public.daily_trackers (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  date date not null,
  value real not null,
  primary key (user_id, type, date)
);

create table public.tracker_settings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  goal real not null,
  display_unit text not null,
  unit_size real,
  primary key (user_id, type)
);

create table public.sleep_logs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  bedtime text not null,
  wake_time text not null,
  duration_min int not null,
  quality int check (quality between 1 and 5),
  note text,
  primary key (user_id, date)
);

create table public.body_measurements (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  value real not null,
  date date not null,
  unique (user_id, type, date)
);

create table public.user_foods (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kcal real not null,
  protein real not null,
  fat real not null,
  carbs real not null
);
create index on public.user_foods (user_id);

-- Değerler kayıt anındaki yiyecekten kopyalanır: yiyecek sonradan değişse/silinse de geçmiş doğru kalır.
create table public.food_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  name text not null,
  grams real not null check (grams > 0),
  kcal_100 real not null,
  protein_100 real not null,
  fat_100 real not null,
  carbs_100 real not null,
  logged_at timestamptz not null default now()
);
create index on public.food_logs (user_id, date);

create table public.streak_days (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  status text not null check (status in ('completed','frozen','missed')),
  primary key (user_id, date)
);

create table public.streak_state (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  freezes_available int not null default 0,
  last_evaluated date
);

create table public.badges (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  milestone int not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, milestone)
);

create table public.settings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  value jsonb not null,
  primary key (user_id, key)
);

-- RLS: tek kural her tablo için aynı
do $$
declare t text;
begin
  foreach t in array array['user_exercises','exercise_favorites','workout_templates','template_exercises','day_schedule',
    'workout_sessions','session_sets','habits','habit_logs','daily_trackers','tracker_settings','sleep_logs',
    'body_measurements','user_foods','food_logs','streak_days','streak_state','badges','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Adım sensörü sık yazar: oku-ekle-yaz yerine tek atomik artırma; sonuç 0'ın altına inmez.
create function public.add_tracker_value(p_type text, p_date date, p_delta real)
returns void language sql security invoker set search_path = '' as $$
  insert into public.daily_trackers (type, date, value) values (p_type, p_date, greatest(0, p_delta))
  on conflict (user_id, type, date) do update set value = greatest(0, public.daily_trackers.value + p_delta);
$$;
