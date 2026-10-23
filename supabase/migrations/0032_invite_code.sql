-- كود دعوة منفصل عن كود الدخول.
--
-- المشكلة: الدخول بيتم بـ login_code لوحده من غير رقم سري،
-- وكارت الدعوة كان بيقول للولد يبعت نفس الكود ده لصحابه على
-- واتساب. يعني أي حد ياخد الكود يقدر يدخل بحساب صاحبه ويصرف
-- نقطه على هدية.
--
-- الحل: كود تاني للدعوة بس. شكله ABC-234، والشرطة مقصودة —
-- دالة الدخول بترفض أي كود فيه غير حروف وأرقام، فمستحيل كود
-- دعوة يدخّل حد مهما حصل.

create or replace function gen_invite_code() returns text
language plpgsql as $$
declare
  letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  digits  text := '23456789';
  v text;
  i int;
begin
  loop
    v := '';
    for i in 1..3 loop
      v := v || substr(letters, 1 + floor(random() * length(letters))::int, 1);
    end loop;
    v := v || '-';
    for i in 1..3 loop
      v := v || substr(digits, 1 + floor(random() * length(digits))::int, 1);
    end loop;
    exit when not exists (select 1 from student_accounts where invite_code = v);
  end loop;
  return v;
end;
$$;

alter table student_accounts add column if not exists invite_code text;

create unique index if not exists student_accounts_invite_code_key
  on student_accounts (invite_code);

-- الحسابات الموجودة
do $$
declare r record;
begin
  for r in select student_id from student_accounts where invite_code is null loop
    update student_accounts set invite_code = gen_invite_code() where student_id = r.student_id;
  end loop;
end $$;

-- الحسابات الجاية: الداتابيز هي اللي بتولّده، فمفيش مسار في
-- الكود يقدر ينساه
alter table student_accounts alter column invite_code set default gen_invite_code();
alter table student_accounts alter column invite_code set not null;
