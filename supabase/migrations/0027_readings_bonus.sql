-- بونص «قرا القراءات» في قداس الجمعة.
--
-- الولد اللي بيقرا القراءات بيجهّزها قبلها، فده بونص بيتسجّل
-- بنفس طريقة بونص الدرجة الكاملة في المسابقة: ⭐ جنب اسمه في
-- كشف القداس.

insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('readings', 'قرا القراءات في القداس', 15, 'friday', true, true, 64)
on conflict (code) do update set
  is_active = true,
  xp = excluded.xp,
  name_ar = excluded.name_ar;
