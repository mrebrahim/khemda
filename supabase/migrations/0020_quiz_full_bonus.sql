-- بونص الدرجة النهائية في المسابقة: الولد اللي يجيب الدرجة كاملة ياخد زيادة
-- فوق نقط الدخول، حتى لو مش من التلاتة الأوائل.

alter table event_marks add column if not exists bonus boolean not null default false;

insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('quiz_full', 'الدرجة النهائية في المسابقة', 15, 'thursday', true, true, 25)
on conflict (code) do nothing;
