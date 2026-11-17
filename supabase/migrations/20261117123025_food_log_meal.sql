-- Öğün sütunu (özellik sonra iptal edildi; 20261117123512 ile kaldırıldı).
alter table public.food_logs add column meal text check (meal in ('breakfast','lunch','dinner','snack'));
