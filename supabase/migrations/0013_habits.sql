-- نظام العادة والتذكير:
-- reminder_prefs: الولد يختار يتفكّر إمتى، وهدفه اليومي، ويقدر يوقف التذكير مؤقتًا
-- والـindex بيمنع إرسال نفس نوع التذكير مرتين لنفس الولد في نفس اليوم

create table if not exists public.reminder_prefs (
  student_id   bigint primary key references public.students(id) on delete cascade,
  reminders_on boolean  not null default true,
  slot         text     not null default 'evening' check (slot in ('evening','night')),
  daily_goal   smallint not null default 2 check (daily_goal between 1 and 2),
  paused_until date,
  updated_at   timestamptz not null default now()
);

alter table public.reminder_prefs enable row level security;

create policy "servants read prefs" on public.reminder_prefs
  for select to authenticated using (true);

-- مفيش تذكير مكرر لنفس الولد بنفس النوع في نفس اليوم
create unique index if not exists reminder_log_once
  on public.reminder_log (student_id, kind, on_date);

-- بنجيب أيام النشاط بسرعة للتقويم الأسبوعي
create index if not exists daily_missions_student_date
  on public.daily_missions (student_id, on_date desc);
