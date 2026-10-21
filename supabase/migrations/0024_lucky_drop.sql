-- صندوق الحظ الأسطوري: حدث بيفتحه الخادم يوم الجمعة، الولد بيمسح QR
-- متغيّر وبيفتح صندوق واحد وياخد مكافأة.
--
-- القاعدة الأهم هنا إن السحب لازم يحصل مرة واحدة بالظبط حتى لو النت
-- قطع أو الولد حدّث الصفحة، وإن مخزون الجوايز ما ينقصش مرتين. عشان
-- كده السحب كله جوّه دالة واحدة في الداتابيز بقفل على صف الحدث.

create table if not exists lucky_events (
  id bigserial primary key,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'ended', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  -- شرط الحضور: الولد لازم يكون متسجّل حضور الخدمة النهارده
  require_attendance boolean not null default true,
  -- أقل مستوى مسموح له يشارك (null = الكل)
  min_level integer,
  max_attempts integer not null default 1 check (max_attempts between 1 and 5),
  -- بيزيد عشان كل أكواد الـQR القديمة تبطل فورًا
  qr_epoch integer not null default 1,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists lucky_prizes (
  id bigserial primary key,
  event_id bigint not null references lucky_events(id) on delete cascade,
  kind text not null check (kind in ('xp', 'taayo', 'badge')),
  label text not null,
  xp integer not null default 0 check (xp >= 0),
  taayo integer not null default 0 check (taayo >= 0),
  weight integer not null check (weight > 0),
  -- null = من غير حد
  total_stock integer check (total_stock is null or total_stock >= 0),
  remaining_stock integer check (remaining_stock is null or remaining_stock >= 0),
  sort_order integer not null default 0
);

create index if not exists lucky_prizes_event on lucky_prizes (event_id);

create table if not exists lucky_attempts (
  id bigserial primary key,
  event_id bigint not null references lucky_events(id) on delete cascade,
  student_id bigint not null references students(id) on delete cascade,
  attempt_no integer not null,
  prize_id bigint references lucky_prizes(id),
  prize_kind text,
  prize_label text,
  prize_xp integer not null default 0,
  prize_taayo integer not null default 0,
  -- الاحتمالات الفعلية وقت السحب — للمراجعة
  odds jsonb,
  idempotency_key text not null,
  xp_granted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, student_id, attempt_no),
  unique (idempotency_key)
);

create index if not exists lucky_attempts_event on lucky_attempts (event_id);
create index if not exists lucky_attempts_student on lucky_attempts (student_id);

create table if not exists lucky_claims (
  id bigserial primary key,
  attempt_id bigint not null unique references lucky_attempts(id) on delete cascade,
  event_id bigint not null references lucky_events(id) on delete cascade,
  student_id bigint not null references students(id) on delete cascade,
  label text not null,
  taayo integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'cancelled')),
  delivered_by text,
  delivered_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists lucky_claims_status on lucky_claims (status);

create table if not exists lucky_audit (
  id bigserial primary key,
  event_id bigint references lucky_events(id) on delete cascade,
  actor text,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lucky_audit_event on lucky_audit (event_id, created_at desc);

alter table lucky_events enable row level security;
alter table lucky_prizes enable row level security;
alter table lucky_attempts enable row level security;
alter table lucky_claims enable row level security;
alter table lucky_audit enable row level security;

-- الخدام بس. الأولاد بيوصلوا للسحب من خلال السيرفر بمفتاح الخدمة.
drop policy if exists "lucky_events servants" on lucky_events;
create policy "lucky_events servants" on lucky_events
  for all to authenticated using (true) with check (true);

drop policy if exists "lucky_prizes servants" on lucky_prizes;
create policy "lucky_prizes servants" on lucky_prizes
  for all to authenticated using (true) with check (true);

drop policy if exists "lucky_attempts servants" on lucky_attempts;
create policy "lucky_attempts servants" on lucky_attempts
  for select to authenticated using (true);

drop policy if exists "lucky_claims servants" on lucky_claims;
create policy "lucky_claims servants" on lucky_claims
  for all to authenticated using (true) with check (true);

-- قاعدة نقط صندوق الحظ — القيمة الفعلية بتيجي من الجايزة نفسها
insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('lucky_drop', 'صندوق الحظ', 0, 'bonus', false, true, 62)
on conflict (code) do update set is_active = true, name_ar = excluded.name_ar;

/**
 * السحب. كل حاجة جوّه معاملة واحدة بقفل على صف الحدث:
 *  - نفس idempotency_key بيرجّع نفس المحاولة (مش سحب جديد)
 *  - عدد المحاولات بيتحسب جوّه القفل، فمفيش سحبتين في نفس اللحظة
 *  - مخزون الجايزة بينقص في نفس المعاملة، فمستحيل يتجاوز
 */
create or replace function lucky_open(
  p_event bigint,
  p_student bigint,
  p_idem text
) returns lucky_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event lucky_events;
  v_attempt lucky_attempts;
  v_count integer;
  v_total integer;
  v_roll integer;
  v_acc integer := 0;
  v_prize lucky_prizes;
  v_odds jsonb;
begin
  -- لو الطلب اتبعت مرتين (نت ضعيف) بنرجّع نفس النتيجة
  select * into v_attempt from lucky_attempts where idempotency_key = p_idem;
  if found then
    return v_attempt;
  end if;

  select * into v_event from lucky_events where id = p_event for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.status <> 'active' then
    raise exception 'event_not_active';
  end if;
  if v_event.starts_at is not null and now() < v_event.starts_at then
    raise exception 'event_not_started';
  end if;
  if v_event.ends_at is not null and now() > v_event.ends_at then
    raise exception 'event_ended';
  end if;

  select count(*) into v_count
    from lucky_attempts
   where event_id = p_event and student_id = p_student;

  if v_count >= v_event.max_attempts then
    raise exception 'no_attempts_left';
  end if;

  -- الجوايز المتاحة دلوقتي بس
  select coalesce(sum(weight), 0) into v_total
    from lucky_prizes
   where event_id = p_event
     and (remaining_stock is null or remaining_stock > 0);

  if v_total <= 0 then
    raise exception 'no_prizes_left';
  end if;

  select jsonb_agg(jsonb_build_object('label', label, 'weight', weight))
    into v_odds
    from lucky_prizes
   where event_id = p_event
     and (remaining_stock is null or remaining_stock > 0);

  v_roll := floor(random() * v_total)::integer;

  for v_prize in
    select * from lucky_prizes
     where event_id = p_event
       and (remaining_stock is null or remaining_stock > 0)
     order by id
     for update
  loop
    v_acc := v_acc + v_prize.weight;
    exit when v_roll < v_acc;
  end loop;

  if v_prize.remaining_stock is not null then
    update lucky_prizes
       set remaining_stock = remaining_stock - 1
     where id = v_prize.id and remaining_stock > 0;
    if not found then
      raise exception 'prize_just_ran_out';
    end if;
  end if;

  insert into lucky_attempts (
    event_id, student_id, attempt_no, prize_id, prize_kind, prize_label,
    prize_xp, prize_taayo, odds, idempotency_key
  ) values (
    p_event, p_student, v_count + 1, v_prize.id, v_prize.kind, v_prize.label,
    v_prize.xp, v_prize.taayo, v_odds, p_idem
  ) returning * into v_attempt;

  if v_prize.kind = 'taayo' then
    insert into lucky_claims (attempt_id, event_id, student_id, label, taayo)
    values (v_attempt.id, p_event, p_student, v_prize.label, v_prize.taayo);
  end if;

  insert into lucky_audit (event_id, actor, action, meta)
  values (
    p_event,
    'student:' || p_student,
    'open',
    jsonb_build_object('attempt', v_attempt.id, 'prize', v_prize.label)
  );

  return v_attempt;
end;
$$;

revoke all on function lucky_open(bigint, bigint, text) from public, anon, authenticated;
