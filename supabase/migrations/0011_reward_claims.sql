-- طلبات الجوايز: الولد بيطلب لما يوصل للمستوى، والمشرف بيوافق ويسلّم
create table public.reward_claims (
  id           bigint generated always as identity primary key,
  student_id   bigint not null references public.students(id) on delete cascade,
  season_id    bigint not null references public.seasons(id) on delete cascade,
  level        int    not null,
  status       text   not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   text,
  note         text,
  unique (student_id, season_id, level),
  check (status in ('pending','approved','delivered','rejected'))
);
create index reward_claims_status_idx on public.reward_claims (status, requested_at);

alter table public.reward_claims enable row level security;
create policy reward_claims_auth_all on public.reward_claims
  for all to authenticated using (true) with check (true);
