-- Hesabı siler: auth kullanıcısı silinince tüm tablolardaki satırlar (on delete cascade) gider.
-- Profil fotoğrafı istemci tarafından Storage API ile önce silinir (storage tablosuna doğrudan silme yapılmaz).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
