-- سجل دخول الأولاد باليوم — عشان تقرير «مين دخل ومين عمل المهمة»
-- يبقى دقيق، مش مبني على آخر دخول بس.

create table if not exists student_logins (
  id bigserial primary key,
  student_id bigint not null references students(id) on delete cascade,
  on_date date not null,
  first_at timestamptz not null default now(),
  unique (student_id, on_date)
);

create index if not exists student_logins_date on student_logins (on_date);

alter table student_logins enable row level security;

drop policy if exists "student_logins read" on student_logins;
create policy "student_logins read" on student_logins
  for select to authenticated using (true);
