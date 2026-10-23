-- لوحة السنة: مجموع نقط الولد في كل المواسم.
--
-- لوحة الموسم بتصفّر مع كل موسم جديد — وده مقصود عشان اللي
-- بيدخل متأخر يلاقي سباق لسه بادئ. اللوحة دي هي الضمان إن
-- مفيش نقطة بتضيع: بتجمع السنة كلها ومابتصفّرش أبدًا، وعليها
-- الجايزة الكبرى في آخر السنة.

create or replace view public.board_alltime
with (security_invoker = false) as
with totals as (
  select st.id,
         coalesce(sa.nickname, st.full_name) as display_name,
         c.area, c.stage,
         coalesce(sum(l.xp) filter (where l.is_verified), 0)::int as verified_xp,
         coalesce(sum(l.xp), 0)::int                              as total_xp,
         count(distinct l.season_id)::int                         as seasons_played
  from public.students st
  join public.classes c on c.id = st.class_id
  left join public.student_accounts sa on sa.student_id = st.id
  left join public.xp_ledger l on l.student_id = st.id
  where st.is_active
  group by st.id, sa.nickname, st.full_name, c.area, c.stage
)
select t.id, t.display_name, t.area, t.stage, t.verified_xp, t.total_xp,
       t.seasons_played,
       r.name as rank_name, r.tier as rank_tier, r.level as rank_level
from totals t
left join lateral (
  select name, tier, level from public.ranks
  where xp_required <= t.total_xp order by level desc limit 1
) r on true
where t.total_xp > 0;

grant select on public.board_alltime to anon;
