-- QR الحضور + الدخول بالكود لوحده
alter table public.student_accounts alter column pin_hash drop not null;

create or replace function public.gen_qr_token() returns text
language sql volatile as $$
  select encode(extensions.gen_random_bytes(16), 'hex');
$$;

insert into public.qr_tokens (student_id, token)
select st.id, public.gen_qr_token()
from public.students st
where st.is_active
  and not exists (select 1 from public.qr_tokens q where q.student_id = st.id and q.is_active);
