-- «مين علّمك اللعبة؟» — الولد الجديد بيكتب كود اللي علّمه مرة واحدة،
-- واللي علّمه بياخد نقط لما الولد الجديد يخلّص أول مهمة فعلاً.

create table if not exists referrals (
  id bigserial primary key,
  inviter_id bigint not null references students(id) on delete cascade,
  invitee_id bigint not null unique references students(id) on delete cascade,
  code_used text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  xp_granted boolean not null default false,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  note text,
  -- مينفعش يكتب كوده هو
  constraint referrals_not_self check (inviter_id <> invitee_id)
);

create index if not exists referrals_inviter on referrals (inviter_id);
create index if not exists referrals_status on referrals (status);

alter table referrals enable row level security;

drop policy if exists "referrals servants" on referrals;
create policy "referrals servants" on referrals
  for all to authenticated using (true) with check (true);

insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('referral', 'علّمت صاحبك اللعبة', 10, 'bonus', false, true, 63)
on conflict (code) do update
  set xp = excluded.xp, name_ar = excluded.name_ar, is_active = true;
