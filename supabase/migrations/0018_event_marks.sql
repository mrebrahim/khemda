-- تسجيل الخادم لحضور المواعيد الأسبوعية (تسبحة/مسابقة/قداس/مدارس الأحد)
-- الجدول ده مصدر العلامة اللي الخادم بيشوفها، والنقط نفسها بتدخل xp_ledger.

create table if not exists event_marks (
  id bigserial primary key,
  student_id bigint not null references students(id) on delete cascade,
  event_key text not null check (
    event_key in ('tasbeha', 'quiz_thu', 'mass', 'sunday_school', 'quiz_fri')
  ),
  on_date date not null,
  -- ١ أو ٢ أو ٣ للمسابقات بس، و null لباقي المواعيد
  place smallint check (place is null or place between 1 and 3),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, event_key, on_date)
);

create index if not exists event_marks_event_date on event_marks (event_key, on_date);

-- مركز واحد بس لكل مسابقة: مستحيل يبقى في اتنين أول
create unique index if not exists event_marks_one_place_per_event
  on event_marks (event_key, on_date, place)
  where place is not null;

alter table event_marks enable row level security;

drop policy if exists "event_marks read" on event_marks;
create policy "event_marks read" on event_marks
  for select to authenticated using (true);

drop policy if exists "event_marks write" on event_marks;
create policy "event_marks write" on event_marks
  for all to authenticated using (true) with check (true);

-- تذكير المواعيد بيتبعت مرة واحدة لكل حدث في اليوم
create table if not exists event_reminder_log (
  id bigserial primary key,
  event_key text not null,
  on_date date not null,
  sent_students integer not null default 0,
  sent_admins integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_key, on_date)
);

alter table event_reminder_log enable row level security;
