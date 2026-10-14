import Link from "next/link";
import NavBar from "@/components/NavBar";
import Scanner from "@/components/Scanner";
import { todayISO, formatArabicDate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function CheckInPage() {
  const today = todayISO();

  return (
    <>
      <NavBar title="تسجيل الحضور بالكود" back="/" />
      <main className="max-w-md mx-auto px-3 py-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
          <p className="font-bold text-brand-900">{formatArabicDate(today)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            الحضور بيتسجّل على اليوم ده
          </p>
        </div>

        <Scanner />

        <Link
          href={`/attendance/students?date=${today}`}
          className="block text-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-3 font-bold text-slate-600 hover:border-brand-400 transition"
        >
          الكارت ضايع؟ سجّل يدوي من الكشف
        </Link>
      </main>
    </>
  );
}
