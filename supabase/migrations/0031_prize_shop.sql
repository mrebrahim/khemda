-- محل الجوايز: النقط بقت فلوس.
--
-- الهدية ليها سعر، واللي ياخدها بيتخصم منه سعرها ومستواه بينزل
-- معاها (المستوى محسوب من مجموع النقط، فالخصم بينزّله لوحده).
-- يعني الولد بيختار بين الهدية ومركزه على اللوحة.

insert into activity_rules (code, name_ar, xp, category, is_verified, is_active, sort_order)
values ('prize_claim', 'استلام هدية (خصم)', 0, 'bonus', true, true, 70)
on conflict (code) do update set is_active = true, name_ar = excluded.name_ar;

-- الشراء: الخصم والطلب في معاملة واحدة مع قفل على الولد، فمفيش
-- شراء حاجتين بنفس النقط. والـunique على (student, season, level)
-- بيمنع نفس الهدية مرتين.
create or replace function claim_prize(
  p_student bigint, p_season bigint, p_level int, p_cost int, p_label text
) returns table (claim_id bigint, balance int)
language plpgsql security definer set search_path = public as $$
declare
  v_balance int;
  v_claim   bigint;
begin
  if p_cost <= 0 then
    raise exception 'سعر الهدية مش مظبوط';
  end if;

  perform 1 from students where id = p_student for update;

  select coalesce(sum(xp), 0) into v_balance
  from xp_ledger where student_id = p_student and season_id = p_season;

  if v_balance < p_cost then
    raise exception 'نقطك مش كفاية — معاك % والهدية بـ%', v_balance, p_cost;
  end if;

  insert into reward_claims (student_id, season_id, level)
  values (p_student, p_season, p_level)
  returning id into v_claim;

  insert into xp_ledger
    (student_id, season_id, rule_code, xp, is_verified, source, dedupe_key, occurred_on, note, created_by)
  values
    (p_student, p_season, 'prize_claim', -p_cost, true, 'admin',
     'prize:' || v_claim, current_date, 'استلام ' || p_label, 'shop');

  return query select v_claim, v_balance - p_cost;
end;
$$;

-- الرفض بيرجّع النقط — الولد مايتعاقبش على طلب المشرف رفضه.
-- الطلبات القديمة (قبل المحل) مفيش خصم ليها فبترجع صفر.
create or replace function refund_prize(p_claim bigint, p_by text)
returns int
language plpgsql security definer set search_path = public as $$
declare
  c reward_claims%rowtype;
  v_cost int;
begin
  select * into c from reward_claims where id = p_claim for update;
  if not found then
    raise exception 'الطلب ده مش موجود';
  end if;

  select -xp into v_cost from xp_ledger where dedupe_key = 'prize:' || p_claim;
  if v_cost is null then
    return 0;
  end if;

  insert into xp_ledger
    (student_id, season_id, rule_code, xp, is_verified, source, dedupe_key, occurred_on, note, created_by)
  values
    (c.student_id, c.season_id, 'prize_claim', v_cost, true, 'admin',
     'prize-refund:' || p_claim, current_date, 'رجوع نقط هدية اترفضت', p_by)
  on conflict (dedupe_key) do nothing;

  return v_cost;
end;
$$;
