-- حساب ديمو: مخدوم موقوف (مش ظاهر في أي كشف ولا تقرير ولا لوحة)
-- بس حسابه بيعدّي في تسجيل الدخول عشان المشرف يجرّب اللعبة.
alter table public.student_accounts
  add column if not exists is_demo boolean not null default false;
