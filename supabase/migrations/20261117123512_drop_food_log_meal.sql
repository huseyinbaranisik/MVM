-- Öğün özelliği iptal edildi.
alter table public.food_logs drop column if exists meal;
