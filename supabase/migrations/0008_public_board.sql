-- لوحة الأبطال العامة: views فيها الأعمدة الآمنة بس، الزائر المجهول
-- بياخد قراءة عليها من غير ما ياخد أي صلاحية على جداول المخدومين.
create view public.board_season
with (security_invoker = false) as
select name, starts_on, ends_on from public.seasons where is_active;

create view public.board_leaderboard
with (security_invoker = false) as
with totals as (
  select st.id,
         coalesce(sa.nickname, st.full_name) as display_name,
         c.area, c.stage,
         coalesce(sum(l.xp) filter (where l.is_verified), 0)::int as verified_xp,
         coalesce(sum(l.xp), 0)::int                              as total_xp
  from public.students st
  join public.classes c on c.id = st.class_id
  left join public.student_accounts sa on sa.student_id = st.id
  left join public.xp_ledger l
    on l.student_id = st.id
   and l.season_id = (select id from public.seasons where is_active)
  where st.is_active
  group by st.id, sa.nickname, st.full_name, c.area, c.stage
)
select t.id, t.display_name, t.area, t.stage, t.verified_xp, t.total_xp,
       r.name as rank_name, r.tier as rank_tier
from totals t
left join lateral (
  select name, tier from public.ranks
  where xp_required <= t.total_xp order by level desc limit 1
) r on true
where t.verified_xp > 0;

grant select on public.board_season      to anon;
grant select on public.board_leaderboard to anon;
