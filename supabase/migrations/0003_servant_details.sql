alter table public.servants
  add column birth_date        date,
  add column activity          text,   -- النشاط
  add column home_area         text,   -- منطقة سكن الخادم (مش فصله)
  add column street            text,
  add column house_no          text,
  add column confession_father text;

create index servants_birth_idx on public.servants ((extract(month from birth_date)));
