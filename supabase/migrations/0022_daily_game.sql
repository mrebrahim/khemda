-- تحدي النهارده: لعبة مختلفة كل يوم، والترتيب بيلف كل أسبوع.
-- اللعبة نفسها بتتولّد من التاريخ في الكود، فمفيش جدول محتوى.

insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('game', 'تحدي النهارده', 2, 'daily', false, true, 17)
on conflict (code) do update
  set xp = excluded.xp, name_ar = excluded.name_ar, is_active = true;
