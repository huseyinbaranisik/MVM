-- Sıvılar ml ile girilir; yiyecekler kategorilidir. food_logs.grams sütunu miktarı (g ya da ml) tutar:
-- adı v1.0.0 APK ile uyum için değişmedi.
alter table public.user_foods add column unit text not null default 'g' check (unit in ('g','ml'));
alter table public.user_foods add column category text;
alter table public.food_logs add column unit text not null default 'g' check (unit in ('g','ml'));
