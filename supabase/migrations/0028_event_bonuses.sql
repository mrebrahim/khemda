-- الحدث بقى يقبل أكتر من بونص.
--
-- قبل كده كان فيه بونص واحد بس (bonus boolean)، وده كفاية
-- للمسابقة («الدرجة كاملة»). إنما القداس فيه تلات حاجات
-- منفصلة: حضر التسبحة قبله، حضر تحضير القرايات، وقرا في
-- القداس — وكل واحدة نقطها مختلفة وبتتحط وتتشال لوحدها.

alter table event_marks add column if not exists bonuses text[] not null default '{}';

-- البونص القديم كان دايمًا «الدرجة كاملة» في المسابقات
update event_marks set bonuses = array['quiz_full']
where bonus = true and bonuses = '{}';

insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order) values
  ('readings_prep', 'حضر تحضير القرايات', 10, 'friday', true, true, 65),
  ('tasbeha_bonus', 'حضر التسبحة قبل القداس', 40, 'friday', true, true, 66)
on conflict (code) do update set
  is_active = true,
  xp = excluded.xp,
  name_ar = excluded.name_ar;
