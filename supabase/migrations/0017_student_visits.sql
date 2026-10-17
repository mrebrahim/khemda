-- افتقاد المخدومين: علامة لكل ولد كل أسبوع
-- الأسبوع بيبدأ السبت (week_start) عشان الجمعة تبقى آخر يوم في الأسبوع
create table if not exists public.student_visits (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students(id) on delete cascade,
  week_start  date   not null,
  visited_on  date   not null default current_date,
  note        text,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (student_id, week_start)
);

create index if not exists student_visits_student on public.student_visits (student_id, week_start desc);

alter table public.student_visits enable row level security;

create policy "servants manage visits" on public.student_visits
  for all to authenticated using (true) with check (true);
