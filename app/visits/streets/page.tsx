import Link from "next/link";
import NavBar from "@/components/NavBar";
import VisitRow, { type VisitStudent } from "@/components/VisitRow";
import StreetFilter, { type StreetOption } from "@/components/StreetFilter";
import { createClient } from "@/lib/supabase/server";
import { weeksBetween, weekStartOf } from "@/lib/visits";
import { byHouse, clusterKey, parseAddress } from "@/lib/address";
import { AREAS, todayISO } from "@/lib/types";

export const dynamic = "force-dynamic";

type Group = {
  key: string;
  street: string;
  parent: string | null;
  parentKey: string | null;
  areas: Set<string>;
  students: VisitStudent[];
};

export default async function StreetsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; only?: string; street?: string }>;
}) {
  const { area, only, street } = await searchParams;
  const pendingOnly = only === "1";

  const today = todayISO();
  const week = weekStartOf(today);

  const supabase = await createClient();
  const [{ data: students }, { data: visits }, { data: classRows }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, address, phone, father_phone, mother_phone, class_id")
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("student_visits").select("student_id, week_start"),
    supabase.from("classes").select("id, area, stage"),
  ]);

  const lastOf = new Map<number, string>();
  const thisWeek = new Set<number>();
  for (const v of visits ?? []) {
    if (v.week_start === week) thisWeek.add(v.student_id);
    const prev = lastOf.get(v.student_id);
    if (!prev || v.week_start > prev) lastOf.set(v.student_id, v.week_start);
  }

  const classOf = new Map(
    (classRows ?? []).map((c) => [c.id, { area: c.area as string, stage: c.stage as string }]),
  );

  const groups = new Map<string, Group>();
  const noAddress: VisitStudent[] = [];
  let total = 0;
  let done = 0;

  for (const st of students ?? []) {
    const cls = classOf.get(st.class_id);
    if (!cls) continue;
    if (area && cls.area !== area) continue;

    const last = lastOf.get(st.id) ?? null;
    const visited = thisWeek.has(st.id);
    total++;
    if (visited) done++;
    if (pendingOnly && visited) continue;

    const p = parseAddress(st.address);
    const row: VisitStudent = {
      id: st.id,
      full_name: st.full_name,
      address: st.address,
      area: cls.area,
      stage: cls.stage,
      phone: st.phone,
      father_phone: st.father_phone,
      mother_phone: st.mother_phone,
      house: p.house,
      visitedThisWeek: visited,
      lastVisit: last,
      weeksAgo: last ? weeksBetween(last, week) : null,
    };

    if (!p.streetKey) {
      noAddress.push(row);
      continue;
    }

    // الشارع المسمّى بيبقى هو هو في أي منطقة، أما الشوارع المرقّمة
    // («ش ٢٣») فكل منطقة ليها واحد مختلف تمامًا — فبنفصلهم.
    const gk = /^\d+$/.test(p.streetKey) ? `${cls.area}|${p.streetKey}` : p.streetKey;

    const g: Group = groups.get(gk) ?? {
      key: gk,
      street: p.street ?? "—",
      parent: p.parent,
      parentKey: p.parentKey,
      areas: new Set<string>(),
      students: [],
    };
    if (p.parent && !g.parent) {
      g.parent = p.parent;
      g.parentKey = p.parentKey;
    }
    g.areas.add(cls.area);
    g.students.push(row);
    groups.set(gk, g);
  }

  // الشارع الكبير وكل المتفرّع منه ورا بعض، عشان الخادم يمشي خط واحد
  const all = [...groups.values()]
    .map((g) => ({ ...g, students: [...g.students].sort(byHouse) }))
    .sort((a, b) => {
      const ck = clusterKey(a).localeCompare(clusterKey(b), "ar");
      if (ck !== 0) return ck;
      return b.students.length - a.students.length;
    });

  const list = street ? all.filter((g) => g.key === street) : all;

  const href = (next: { area?: string; only?: string; street?: string }) => {
    const p = new URLSearchParams();
    const a = next.area ?? area ?? "";
    const o = next.only ?? (pendingOnly ? "1" : "");
    const st = next.street ?? street ?? "";
    if (a) p.set("area", a);
    if (o === "1") p.set("only", "1");
    if (st) p.set("street", st);
    const q = p.toString();
    return q ? `/visits/streets?${q}` : "/visits/streets";
  };

  const streetOptions: StreetOption[] = [
    { value: "", label: `كل الشوارع (${all.length})`, href: href({ street: "" }) },
    ...all.map((g) => ({
      value: g.key,
      label: `${g.street} — ${g.students.length}`,
      href: href({ street: g.key }),
    })),
  ];

  return (
    <>
      <NavBar title="الافتقاد المجمع" back="/visits" />
      <main className="max-w-2xl mx-auto px-3 py-4 space-y-3">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">🏘️ كل الولاد بالشوارع</h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            ١ع و٢ع و٣ع مع بعض، مرتّبين بالشارع وبرقم البيت — فتمشي شارع
            شارع وتخلّص. الشارع المتفرّع بيجي ورا الشارع الكبير بتاعه
            على طول.
          </p>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <Stat n={done} label="اتفتقدوا الأسبوع ده" tone="green" />
            <Stat n={total - done} label="لسه" tone="amber" />
            <Stat n={list.length} label="شارع" tone="slate" />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <Chip href={href({ area: "" })} active={!area} label="كل المناطق" />
            {AREAS.map((a) => (
              <Chip key={a} href={href({ area: a })} active={area === a} label={a} />
            ))}
          </div>
          <StreetFilter options={streetOptions} value={street ?? ""} />

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip
              href={href({ only: pendingOnly ? "" : "1" })}
              active={pendingOnly}
              label={pendingOnly ? "✓ اللي لسه بس" : "ورّيني اللي لسه بس"}
            />
          </div>
        </section>

        {list.length === 0 && noAddress.length === 0 && (
          <p className="text-center text-slate-500 py-8">مفيش ولاد في الفلتر ده.</p>
        )}

        {list.map((g) => {
          const left = g.students.filter((s) => !s.visitedThisWeek).length;
          return (
            <section
              key={g.key}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <header className="px-4 pt-3 pb-2 border-b border-slate-100">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-bold text-slate-800">{g.street}</h3>
                  <span
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      left === 0 ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {left === 0 ? "خلصت 👏" : `${left} من ${g.students.length}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {g.parent ? `متفرّع من ${g.parent} • ` : ""}
                  {[...g.areas].join(" • ")}
                </p>
              </header>

              <ul className="px-4">
                {g.students.map((s) => (
                  <VisitRow key={s.id} student={s} showClass />
                ))}
              </ul>
            </section>
          );
        })}

        {!street && noAddress.length > 0 && (
          <section className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <header className="px-4 pt-3 pb-2 border-b border-slate-100 bg-amber-50">
              <h3 className="font-bold text-amber-900">
                عناوينهم مش مسجّلة ({noAddress.length})
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5">
                دول مش هيظهروا في أي شارع لحد ما تضيف عنوانهم.
              </p>
            </header>
            <ul className="px-4">
              {noAddress.slice(0, 40).map((s) => (
                <VisitRow key={s.id} student={s} showClass />
              ))}
            </ul>
            {noAddress.length > 40 && (
              <p className="px-4 py-3 text-xs text-slate-500">
                و{noAddress.length - 40} غيرهم — زوّد عناوينهم من{" "}
                <Link href="/students" className="text-brand-700 font-bold">
                  بيانات المخدومين
                </Link>
              </p>
            )}
          </section>
        )}
      </main>
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
      }`}
    >
      {label}
    </a>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: "green" | "amber" | "slate" }) {
  const cls = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  }[tone];
  return (
    <div className={`rounded-xl border py-2 ${cls}`}>
      <p className="font-bold text-xl tabular-nums">{n}</p>
      <p className="text-[10px] leading-tight px-1">{label}</p>
    </div>
  );
}
