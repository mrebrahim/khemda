-- رقم واحد في كل السيستم: إجمالي نقط الولد.
-- كان قبل كده اللوحة بتعرض النقط الموثّقة بس، والليفل متحسّب من الإجمالي،
-- فكان بيظهر ولد نقطه أقل وليفله أعلى. دلوقتي الاتنين من نفس الرقم.
-- وكمان الولد اللي بيعمل مهماته اليومية بقى يظهر على اللوحة حتى لو
-- لسه ما حضرش في الكنيسة.

create or replace view board_leaderboard as
with totals as (
  select st.id,
         coalesce(sa.nickname, st.full_name) as display_name,
         c.area,
         c.stage,
         (coalesce(sum(l.xp) filter (where l.is_verified), 0::bigint))::integer as verified_xp,
         (coalesce(sum(l.xp), 0::bigint))::integer as total_xp
    from students st
    join classes c on c.id = st.class_id
    left join student_accounts sa on sa.student_id = st.id
    left join xp_ledger l
      on l.student_id = st.id
     and l.season_id = (select seasons.id from seasons where seasons.is_active)
   where st.is_active
   group by st.id, sa.nickname, st.full_name, c.area, c.stage
)
select t.id,
       t.display_name,
       t.area,
       t.stage,
       t.verified_xp,
       t.total_xp,
       r.name as rank_name,
       r.tier as rank_tier,
       r.level as rank_level
  from totals t
  left join lateral (
    select ranks.name, ranks.tier, ranks.level
      from ranks
     where ranks.xp_required <= t.total_xp
     order by ranks.level desc
     limit 1
  ) r on true
 where t.total_xp > 0;
