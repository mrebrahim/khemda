-- سحب آخر الموسم.
--
-- الجوايز الكبيرة بتروح لأعلى ٣ بس، يعني باقي الولاد (١٠٠+)
-- بيعرفوا من نص الموسم إنهم مش هياخدوا حاجة ويسيبوا اللعبة.
-- السحب بيغيّر الرسالة من «اتنافس على المركز الأول» لـ«كمّل
-- وإنت داخل السحب» — فبتوصل لكل اللي بيلعبوا مش للتلاتة.

create table if not exists season_draws (
  id bigserial primary key,
  season_id bigint not null references seasons (id) on delete cascade,
  title text not null,
  -- أقل نقط تدخّل الولد السحب
  min_xp int not null default 200,
  -- أعلى كام ولد يتستثنوا (خدوا الجوايز الكبيرة خلاص)
  exclude_top int not null default 3,
  prizes text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'drawn')),
  -- البذرة بتتسجّل عشان السحب يبقى مراجَع
  seed double precision,
  eligible_count int,
  created_by text,
  created_at timestamptz not null default now(),
  drawn_by text,
  drawn_at timestamptz
);

create table if not exists season_draw_winners (
  id bigserial primary key,
  draw_id bigint not null references season_draws (id) on delete cascade,
  student_id bigint not null references students (id) on delete cascade,
  prize_label text not null,
  slot int not null,
  season_xp int not null,
  delivered boolean not null default false,
  created_at timestamptz not null default now(),
  -- ولد واحد ياخد جايزة واحدة، وكل جايزة لواحد
  unique (draw_id, student_id),
  unique (draw_id, slot)
);

alter table season_draws enable row level security;
alter table season_draw_winners enable row level security;

drop policy if exists "season_draws servants" on season_draws;
create policy "season_draws servants" on season_draws
  for all to authenticated using (true) with check (true);

drop policy if exists "season_draw_winners servants" on season_draw_winners;
create policy "season_draw_winners servants" on season_draw_winners
  for all to authenticated using (true) with check (true);

-- السحب نفسه: معاملة واحدة مع قفل على الصف، فلو اتنين خدام
-- دوسوا في نفس اللحظة واحد بس بيسحب.
create or replace function run_season_draw(p_draw_id bigint, p_by text)
returns table (student_id bigint, full_name text, prize_label text, slot int, season_xp int)
language plpgsql
security definer
set search_path = public
as $$
declare
  d           season_draws%rowtype;
  v_seed      double precision;
  v_eligible  int;
begin
  select * into d from season_draws where id = p_draw_id for update;
  if not found then
    raise exception 'السحب ده مش موجود';
  end if;
  if d.status = 'drawn' then
    raise exception 'السحب ده اتعمل خلاص';
  end if;
  if coalesce(array_length(d.prizes, 1), 0) = 0 then
    raise exception 'ضيف جوايز الأول';
  end if;

  v_seed := random();
  perform setseed(v_seed);

  create temp table _pool on commit drop as
  with totals as (
    select st.id, st.full_name, coalesce(sum(l.xp), 0)::int as xp
    from students st
    left join xp_ledger l on l.student_id = st.id and l.season_id = d.season_id
    where st.is_active
    group by st.id, st.full_name
  ),
  ranked as (
    select t.id, t.full_name, t.xp,
           row_number() over (order by t.xp desc, t.id) as place
    from totals t
    where t.xp >= d.min_xp
  )
  select r.id, r.full_name, r.xp
  from ranked r
  where r.place > d.exclude_top;

  select count(*) into v_eligible from _pool;
  if v_eligible = 0 then
    raise exception 'مفيش ولد مستوفي الشرط';
  end if;

  insert into season_draw_winners (draw_id, student_id, prize_label, slot, season_xp)
  select p_draw_id, p.id, pr.label, pr.ord::int, p.xp
  from (
    select id, xp, row_number() over (order by random()) as pick from _pool
  ) p
  join unnest(d.prizes) with ordinality as pr(label, ord) on pr.ord = p.pick;

  update season_draws
     set status = 'drawn', seed = v_seed, eligible_count = v_eligible,
         drawn_by = p_by, drawn_at = now()
   where id = p_draw_id;

  return query
    select w.student_id, s.full_name, w.prize_label, w.slot, w.season_xp
    from season_draw_winners w
    join students s on s.id = w.student_id
    where w.draw_id = p_draw_id
    order by w.slot;
end;
$$;
