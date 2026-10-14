-- مهمة القرايات في القداس الشهري — الخادم بيعتمدها فهي موثقة
insert into public.activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('monthly_readings', 'قراءة القرايات وشرحها في القداس الشهري', 10, 'monthly', true, true, 51)
on conflict (code) do update set xp = excluded.xp, name_ar = excluded.name_ar, is_active = true;
