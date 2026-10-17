-- تنبيهات المشرف: مختلفة عن تنبيهات الأولاد لأنها مش مربوطة بمخدوم
create table if not exists public.admin_push (
  id           bigint generated always as identity primary key,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  label        text,
  is_active    boolean not null default true,
  fail_count   int not null default 0,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.admin_push enable row level security;

create policy "servants manage admin push" on public.admin_push
  for all to authenticated using (true) with check (true);
