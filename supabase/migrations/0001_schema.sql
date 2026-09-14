-- ملف/فصل: منطقة + مرحلة
create table public.classes (
  id          bigint generated always as identity primary key,
  area        text not null,
  stage       text not null,
  saint_name  text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (area, stage)
);

-- المخدومين
create table public.students (
  id                bigint generated always as identity primary key,
  full_name         text not null,
  class_id          bigint not null references public.classes(id) on delete restrict,
  phone             text,
  father_phone      text,
  mother_phone      text,
  address           text,
  birth_date        date,
  confession_father text,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);
create index students_class_idx on public.students (class_id);
create index students_name_idx  on public.students (full_name);

-- الخدام
create table public.servants (
  id         bigint generated always as identity primary key,
  full_name  text not null,
  class_id   bigint references public.classes(id) on delete set null,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index servants_class_idx on public.servants (class_id);

-- يوم الحضور (التاريخ + هل ده القداس الشهري)
create table public.sessions (
  id              bigint generated always as identity primary key,
  session_date    date not null unique,
  is_monthly_mass boolean not null default false,
  note            text,
  created_at      timestamptz not null default now()
);

-- حضور المخدومين
create table public.student_attendance (
  id         bigint generated always as identity primary key,
  session_id bigint not null references public.sessions(id) on delete cascade,
  student_id bigint not null references public.students(id) on delete cascade,
  mass       boolean not null default false,  -- حضور القداس
  communion  boolean not null default false,  -- التناول
  service    boolean not null default false,  -- حضور الخدمة
  tasbeha    boolean not null default false,  -- حضور التسبحة
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index student_att_student_idx on public.student_attendance (student_id);

-- حضور الخدام
create table public.servant_attendance (
  id               bigint generated always as identity primary key,
  session_id       bigint not null references public.sessions(id) on delete cascade,
  servant_id       bigint not null references public.servants(id) on delete cascade,
  preparation      boolean not null default false,  -- التحضير
  visitation       boolean not null default false,  -- الافتقاد
  mass             boolean not null default false,  -- القداس
  communion        boolean not null default false,  -- التناول
  servants_meeting boolean not null default false,  -- اجتماع الخدام
  family_meeting   boolean not null default false,  -- اجتماع الأسرة
  service          boolean not null default false,  -- حضور الخدمة
  updated_at       timestamptz not null default now(),
  unique (session_id, servant_id)
);
create index servant_att_servant_idx on public.servant_attendance (servant_id);

-- RLS: المستخدم المسجّل دخوله بس هو اللي يقرأ ويكتب
alter table public.classes             enable row level security;
alter table public.students            enable row level security;
alter table public.servants            enable row level security;
alter table public.sessions            enable row level security;
alter table public.student_attendance  enable row level security;
alter table public.servant_attendance  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['classes','students','servants','sessions','student_attendance','servant_attendance']
  loop
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_authenticated_all', t);
  end loop;
end $$;
