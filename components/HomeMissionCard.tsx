"use client";

import { useEffect, useState } from "react";
import { chooseMission, missionOffer, type MissionOffer } from "@/app/hero/drop/actions";

/**
 * مهمة البيت بعد ما الصندوق يتفتح.
 *
 * الولد بيختار مهمة يعملها في بيته، والبونص مابيتصرفش غير لما
 * الخادم يتأكد من والديه — وده مكتوب للولد من الأول، عشان
 * المهمة تبقى حقيقية مش كلام.
 *
 * كل المهمات بتقول «والديك» — فيه ولاد فقدوا بابا أو ماما،
 * والمهمة لازم تفضل حلوة لكل ولد.
 */
export default function HomeMissionCard({ initial = null }: { initial?: MissionOffer | null }) {
  const [offer, setOffer] = useState<MissionOffer | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) void missionOffer().then(setOffer);
  }, [initial]);

  async function pick(key: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await chooseMission(key);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    setOffer({
      missions: [],
      chosen: { label: res.label, status: "pending", bonusXp: res.bonusXp },
    });
    setBusy(false);
  }

  if (!offer) return null;

  if (offer.chosen) {
    const done = offer.chosen.status === "confirmed";
    const no = offer.chosen.status === "rejected";
    return (
      <div className="b-frame p-5 mt-3" style={{ borderColor: "rgba(16,185,129,.5)" }}>
        <p className="text-xs text-slate-400">مهمة البيت بتاعتك</p>
        <p className="font-bold text-white text-lg mt-1 leading-snug">
          {offer.chosen.label}
        </p>
        {done ? (
          <p className="text-sm font-bold text-emerald-400 mt-3">
            اتأكدت ✓ وخدت +{offer.chosen.bonusXp} نقطة بونص 🎉
          </p>
        ) : no ? (
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            المهمة دي ماتمّتش المرة دي. مفيش مشكلة — في حدث جديد جرّب تاني 💪
          </p>
        ) : (
          <p className="text-sm text-amber-200 mt-3 leading-relaxed">
            روح اعملها دلوقتي 🏠
            <br />
            <span className="text-slate-400 text-xs">
              البونص +{offer.chosen.bonusXp} نقطة هينزل لما نسأل والديك ونتأكد إنك
              عملتها.
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="b-frame p-5 mt-3" style={{ borderColor: "rgba(242,169,0,.35)" }}>
      <p className="text-center text-xs text-slate-400">بونص زيادة 🏠</p>
      <p className="text-center font-bold text-white text-lg mt-1">
        اختار مهمة تعملها في بيتك
      </p>
      <p className="text-center text-[12px] text-slate-400 mt-2 leading-relaxed">
        هنسأل والديك إنك عملتها فعلاً، وساعتها البونص ينزل باسمك.
      </p>

      <div className="mt-5 space-y-2">
        {offer.missions.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => void pick(m.key)}
            disabled={busy}
            className="w-full border-2 border-white/15 bg-white/5 hover:bg-white/10 text-start p-3.5 transition disabled:opacity-60"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-xl" aria-hidden="true">
                {m.icon}
              </span>
              <span className="font-bold text-white grow">{m.label}</span>
              <span className="text-xs font-bold text-amber-300 shrink-0 tabular-nums">
                +{m.bonusXp}
              </span>
            </span>
            <span className="block text-[12px] text-slate-400 mt-1 leading-relaxed">
              {m.how}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="text-center text-sm font-bold text-red-300 mt-4">{error}</p>}
    </div>
  );
}
