-- قيم معتمدة من المشرف:
--   التناول = ٥ نقط (كانت ٠ مؤقتًا لحد ما تتحدد)
--   "حضور اجتماع مدارس الأحد" = خانة "الخدمة" في نظام الحضور، ٢٠ نقطة
update public.activity_rules set xp = 5, updated_at = now() where code = 'communion';

-- القيود المرحّلة كانت بصفر، فاتصحّحت عشان اللي تناول قبل كده ياخد حقه
update public.xp_ledger
set xp = 5, note = coalesce(note, '') || ' | اتصحّحت لـ٥ نقط بعد اعتماد قيمة التناول'
where rule_code = 'communion' and xp = 0;
