-- Kullanıcı başına en fazla 10 antrenman şablonu
create or replace function public.enforce_template_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.workout_templates where user_id = new.user_id) >= 10 then
    raise exception 'En fazla 10 program oluşturabilirsin' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists workout_templates_limit on public.workout_templates;
create trigger workout_templates_limit before insert on public.workout_templates
  for each row execute function public.enforce_template_limit();
