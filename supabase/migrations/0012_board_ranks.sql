-- سلّم الرتب للوحة العامة: أرقام إعدادات مش بيانات أطفال،
-- فالزائر المجهول بياخد قراءة عليها عشان شريط التقدّم يشتغل في /board.
create or replace view public.board_ranks
with (security_invoker = false) as
select level, name, tier, xp_required
from public.ranks
order by level;

grant select on public.board_ranks to anon;
