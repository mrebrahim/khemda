import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import LuckyQr from "@/components/LuckyQr";
import { createClient } from "@/lib/supabase/server";
import { oddsOf, type LuckyPrize } from "@/lib/lucky";
import {
  addPrize,
  cancelClaimForm,
  confirmHomeMissionForm,
  deleteEventForm,
  deliverClaimForm,
  rejectHomeMissionForm,
  removePrizeForm,
  rotateQrForm,
  setStatusForm,
  toggleAttendanceForm,
} from "../actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  xp: "نقط",
  taayo: "طايو",
  badge: "شارة",
};

export default async function LuckyEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) notFound();

  const supabase = await createClient();
  const [
    { data: event },
    { data: prizeRows },
    { data: attempts },
    { data: claims },
    { data: homeMissions },
    { data: logs },
  ] = await Promise.all([
      supabase
        .from("lucky_events")
        .select("id, title, status, require_attendance, min_level, max_attempts, qr_epoch")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("lucky_prizes")
        .select("id, event_id, kind, label, xp, taayo, weight, total_stock, remaining_stock, sort_order")
        .eq("event_id", eventId)
        .order("sort_order")
        .order("id"),
      supabase
        .from("lucky_attempts")
        .select("id, prize_label, prize_kind, created_at, students(full_name)")
        .eq("event_id", eventId)
        .order("id", { ascending: false }),
      supabase
        .from("lucky_claims")
        .select("id, label, taayo, status, delivered_by, delivered_at, students(full_name)")
        .eq("event_id", eventId)
        .order("status")
        .order("id", { ascending: false }),
      supabase
        .from("lucky_home_missions")
        .select("id, mission_label, bonus_xp, status, decided_by, created_at, students(full_name)")
        .eq("event_id", eventId)
        .order("status")
        .order("id", { ascending: false }),
      supabase
        .from("lucky_audit")
        .select("id, actor, action, meta, created_at")
        .eq("event_id", eventId)
        .order("id", { ascending: false })
        .limit(25),
    ]);

  if (!event) notFound();

  const prizes = (prizeRows ?? []) as LuckyPrize[];
  const odds = oddsOf(prizes);
  const totalWeight = prizes
    .filter((p) => p.remaining_stock === null || p.remaining_stock > 0)
    .reduce((n, p) => n + p.weight, 0);

  const pending = (claims ?? []).filter((c) => c.status === "pending");
  const isActive = event.status === "active";

  const nameOf = (row: { students: unknown }) => {
    const s = row.students as { full_name: string } | { full_name: string }[] | null;
    if (!s) return "—";
    return Array.isArray(s) ? (s[0]?.full_name ?? "—") : s.full_name;
  };

  return (
    <>
      <NavBar title={event.title} back="/lucky" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        {/* ── التحكم ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-800">
                {isActive ? "🟢 شغّال دلوقتي" : "⚪ مش شغّال"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                فتحة واحدة لكل ولد × {event.max_attempts} •{" "}
                {event.require_attendance ? "الحضور مطلوب" : "من غير شرط حضور"}
                {event.min_level ? ` • مستوى ${event.min_level}+` : ""}
              </p>
            </div>
            <form action={isActive ? setStatusForm.bind(null, eventId, "ended") : setStatusForm.bind(null, eventId, "active")}>
              <button
                type="submit"
                className={`rounded-xl px-4 py-2.5 font-bold text-sm text-white ${
                  isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                } transition`}
              >
                {isActive ? "أوقف الحدث" : "شغّل الحدث"}
              </button>
            </form>
          </div>

          {/* شرط الحضور: مقفول = أي ولد بكود الطالب يفتح على طول */}
          <form
            action={toggleAttendanceForm.bind(null, eventId, !event.require_attendance)}
            className="mt-3"
          >
            <button
              type="submit"
              aria-pressed={event.require_attendance}
              className={`w-full rounded-xl border px-3 py-2.5 text-start transition ${
                event.require_attendance
                  ? "border-amber-300 bg-amber-50"
                  : "border-emerald-300 bg-emerald-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  {event.require_attendance ? "🔒" : "🔓"}
                </span>
                <span className="grow">
                  <span
                    className={`block text-sm font-bold ${
                      event.require_attendance ? "text-amber-900" : "text-emerald-900"
                    }`}
                  >
                    {event.require_attendance
                      ? "لازم تسجّل حضور الولد الأول"
                      : "أي ولد بكود الطالب يفتح على طول"}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {event.require_attendance
                      ? "دوس عشان تشيل الشرط وتخلي الولاد يفتحوا بالكود بتاعهم"
                      : "دوس عشان تطلب الحضور قبل الفتح"}
                  </span>
                </span>
              </span>
            </button>
          </form>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <Box n={attempts?.length ?? 0} label="صندوق اتفتح" tone="slate" />
            <Box n={pending.length} label="جايزة للتسليم" tone="amber" />
            <Box
              n={prizes.reduce((n, p) => n + (p.remaining_stock ?? 0), 0)}
              label="مخزون متبقي"
              tone="green"
            />
          </div>
        </section>

        {/* ── الكود ── */}
        {isActive ? (
          <section className="space-y-2">
            <LuckyQr eventId={eventId} />
            <div className="flex gap-2">
              <form action={rotateQrForm.bind(null, eventId)} className="grow">
                <button
                  type="submit"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700"
                >
                  🔄 جدّد الكود دلوقتي
                </button>
              </form>
            </div>
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              اعرض الكود على موبايلك أو على شاشة. الكود بيتغيّر كل دقيقة،
              وتجديده بيبطّل أي كود اتصوّر قبل كده.
            </p>
          </section>
        ) : (
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
            <p className="text-slate-600 text-sm">
              شغّل الحدث عشان الكود يظهر وتقدر تعرضه للأولاد.
            </p>
          </section>
        )}

        {/* ── الجوايز ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm">الجوايز والاحتمالات</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            النسبة بتتحسب من الأوزان المتاحة. أول ما جايزة مخزونها يخلص،
            النسب بتتوزّع لوحدها على الباقي.
          </p>

          <ul className="mt-3">
            {odds.map(({ prize, percent }) => {
              const out = prize.remaining_stock !== null && prize.remaining_stock <= 0;
              return (
                <li
                  key={prize.id}
                  className={`flex items-center gap-2 py-2 border-b border-slate-100 last:border-0 ${
                    out ? "opacity-50" : ""
                  }`}
                >
                  <span className="grow min-w-0">
                    <span className="font-bold text-slate-800 block truncate">
                      {prize.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {KIND_LABEL[prize.kind]}
                      {prize.remaining_stock !== null
                        ? ` • باقي ${prize.remaining_stock} من ${prize.total_stock}`
                        : " • من غير حد"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-brand-800 tabular-nums">
                    {out ? "خلصت" : `${percent}%`}
                  </span>
                  <form action={removePrizeForm.bind(null, eventId, prize.id)}>
                    <button
                      type="submit"
                      aria-label={`امسح ${prize.label}`}
                      className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-300"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>

          {totalWeight === 0 && (
            <p className="mt-3 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              مفيش جوايز متاحة — السحب هيتوقف لحد ما تضيف جايزة.
            </p>
          )}

          <form action={addPrize.bind(null, eventId)} className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-600">ضيف جايزة</p>
            <div className="grid grid-cols-2 gap-2">
              <select name="kind" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="xp">نقط XP</option>
                <option value="taayo">طايو</option>
                <option value="badge">شارة</option>
              </select>
              <input
                name="label"
                required
                maxLength={60}
                placeholder="الاسم — زي ٢٠ طايو"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                name="value"
                type="number"
                min={0}
                defaultValue={0}
                placeholder="القيمة"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                name="weight"
                type="number"
                min={1}
                defaultValue={10}
                placeholder="الوزن"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                name="stock"
                type="number"
                min={0}
                placeholder="المخزون (فاضي = من غير حد)"
                className="col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl border-2 border-brand-500 text-brand-700 font-bold py-2 text-sm"
            >
              ضيف
            </button>
          </form>
        </section>

        {/* ── مهمات البيت: نسأل والديه قبل ما البونص ينزل ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm">مهمات البيت 🏠</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            اسأل والدي الولد الأول. البونص مابينزلش غير لما تدوس «اتأكدت».
          </p>
          {(homeMissions ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 mt-2">لسه محدش اختار مهمة.</p>
          ) : (
            <ul className="mt-2">
              {(homeMissions ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <span className="grow min-w-0">
                    <span className="font-bold text-slate-800 block truncate">
                      {nameOf(m)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {m.mission_label} • بونص {m.bonus_xp}
                      {m.decided_by ? ` • ${m.decided_by}` : ""}
                    </span>
                  </span>

                  {m.status === "pending" ? (
                    <>
                      <form action={confirmHomeMissionForm.bind(null, m.id)}>
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg bg-emerald-600 text-white text-xs font-bold px-3 py-2"
                        >
                          ✅ اتأكدت
                        </button>
                      </form>
                      <form action={rejectHomeMissionForm.bind(null, m.id)}>
                        <button
                          type="submit"
                          aria-label="ماعملهاش"
                          className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </form>
                    </>
                  ) : (
                    <span
                      className={`shrink-0 text-[11px] font-bold rounded-full px-2 py-1 border ${
                        m.status === "confirmed"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-slate-500 bg-slate-50 border-slate-200"
                      }`}
                    >
                      {m.status === "confirmed" ? "اتأكدت ✓" : "ماعملهاش"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── التسليم ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm">جوايز الطايو</h3>
          {(claims ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 mt-2">لسه محدش كسب طايو.</p>
          ) : (
            <ul className="mt-2">
              {(claims ?? []).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <span className="grow min-w-0">
                    <span className="font-bold text-slate-800 block truncate">
                      {nameOf(c)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {c.label} • رقم الجايزة{" "}
                      <span className="font-mono" dir="ltr">
                        #{c.id}
                      </span>
                      {c.status === "delivered" && c.delivered_by
                        ? ` • سلّمها ${c.delivered_by}`
                        : ""}
                    </span>
                  </span>

                  {c.status === "pending" ? (
                    <>
                      <form action={deliverClaimForm.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg bg-emerald-600 text-white text-xs font-bold px-3 py-2"
                        >
                          ✅ سلّمتها
                        </button>
                      </form>
                      <form action={cancelClaimForm.bind(null, c.id, "ألغاها المشرف")}>
                        <button
                          type="submit"
                          aria-label="إلغاء"
                          className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </form>
                    </>
                  ) : (
                    <span
                      className={`shrink-0 text-[11px] font-bold rounded-full px-2 py-1 border ${
                        c.status === "delivered"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-300"
                      }`}
                    >
                      {c.status === "delivered" ? "اتسلّمت" : "ملغية"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── سجل العمليات ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm">آخر اللي حصل</h3>
          <ul className="mt-2 space-y-1.5">
            {(attempts ?? []).slice(0, 12).map((a) => (
              <li key={a.id} className="text-sm text-slate-700 flex gap-2">
                <span className="text-amber-600">🎁</span>
                <span className="grow truncate">
                  <b>{nameOf(a)}</b> كسب {a.prize_label}
                </span>
              </li>
            ))}
            {(logs ?? [])
              .filter((l) => l.action !== "open")
              .slice(0, 8)
              .map((l) => (
                <li key={`l${l.id}`} className="text-[11px] text-slate-400 flex gap-2">
                  <span>•</span>
                  <span className="truncate">
                    {l.action} — {l.actor}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        <form action={deleteEventForm.bind(null, eventId)} className="pb-4">
          <button
            type="submit"
            className="w-full rounded-xl border border-red-200 text-red-700 text-sm font-bold py-2.5 hover:bg-red-50"
          >
            امسح الحدث ده نهائيًا
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          <Link href="/lucky" className="text-brand-700 font-bold hover:underline">
            ← كل الأحداث
          </Link>
        </p>
      </main>
    </>
  );
}

function Box({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "slate" | "amber" | "green";
}) {
  const cls = {
    slate: "bg-slate-50 border-slate-200 text-slate-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
  }[tone];
  return (
    <div className={`rounded-xl border py-2 ${cls}`}>
      <p className="font-bold text-xl tabular-nums">{n}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
