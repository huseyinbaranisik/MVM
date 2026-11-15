-- RLS her sorguda user_id ile filtreler; bu tablolarda user_id indeksi eksikti (Supabase performans danışmanı).
create index on public.template_exercises (user_id);
create index on public.user_exercises (user_id);
create index on public.workout_templates (user_id);
