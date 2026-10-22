-- مهمة البيت بعد صندوق الحظ.
--
-- الولد بيختار مهمة يعملها في بيته، والبونص مابيتصرفش غير لما
-- الخادم يتأكد من والديه. كده البونص بيستاهل، والولد عارف من
-- الأول إننا هنسأل.

create table if not exists lucky_home_missions (
  id bigserial primary key,
  event_id bigint not null references lucky_events (id) on delete cascade,
  student_id bigint not null references students (id) on delete cascade,
  mission_key text not null,
  mission_label text not null,
  bonus_xp int not null default 3,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  decided_by text,
  decided_at timestamptz,
  -- مهمة واحدة لكل ولد في كل حدث
  unique (event_id, student_id)
);

create index if not exists lucky_home_missions_pending
  on lucky_home_missions (event_id, status, created_at desc);

alter table lucky_home_missions enable row level security;

-- الخدام بيشوفوا ويأكدوا. الولاد بيوصلوا من خلال السيرفر بمفتاح الخدمة.
drop policy if exists "lucky_home_missions servants" on lucky_home_missions;
create policy "lucky_home_missions servants" on lucky_home_missions
  for all to authenticated using (true) with check (true);

-- قاعدة نقط البونص — القيمة الفعلية بتيجي من المهمة نفسها
insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('home_mission', 'مهمة البيت', 0, 'bonus', true, true, 63)
on conflict (code) do update set is_active = true, name_ar = excluded.name_ar;
