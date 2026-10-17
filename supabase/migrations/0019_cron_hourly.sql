-- مواعيد الخدمة الأربعة بتوقيت مصر مش ممكن تتظبّط بكرون يومي واحد،
-- فالجدولة بقت جوّه سوپابيز: pg_cron بيدق كل ساعة والسيرفر هو اللي
-- بيقرّر إيه اللي معاده جه (بيقرا ساعة مصر، فالصيفي والشتوي الاتنين مظبوطين).

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- سر الكرون متخزّن في الداتابيز مش في الكود (الريبو عام).
-- مفيش بوليسي RLS خالص، فمحدش يقراه غير السيرفر بمفتاح الخدمة.
create table if not exists app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

insert into app_secrets (name, value)
values ('cron', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (name) do nothing;

do $$
begin
  perform cron.unschedule('khemda-reminders');
exception
  when others then null;
end $$;

select cron.schedule(
  'khemda-reminders',
  '0 * * * *',
  $job$
  select net.http_get(
    url := 'https://khemda.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select value from public.app_secrets where name = 'cron')
    ),
    timeout_milliseconds := 55000
  );
  $job$
);
