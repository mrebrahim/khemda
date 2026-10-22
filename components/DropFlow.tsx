"use client";

import { useState } from "react";
import DropChallenge from "@/components/DropChallenge";
import HomeMissionCard from "@/components/HomeMissionCard";
import LuckyBox from "@/components/LuckyBox";
import type { MissionOffer } from "@/app/hero/drop/actions";
import type { PublicQuestion } from "@/lib/lucky-missions";

export type Previous = { label: string; kind: string; xp: number; taayo: number } | null;

/**
 * رحلة الصندوق كلها بعد المسح:
 * تحدي → الصندوق → مهمة البيت.
 */
export default function DropFlow({
  title,
  left,
  previous,
  firstQuestion,
  offer = null,
}: {
  title: string;
  left: number;
  previous: Previous;
  firstQuestion: PublicQuestion | null;
  /** مهمة البيت لو الولد فتح الصندوق قبل كده */
  offer?: MissionOffer | null;
}) {
  // اللي فتح قبل كده مابيعيدش التحدي
  const [solved, setSolved] = useState<string | null>(previous ? "" : null);
  const [opened, setOpened] = useState(Boolean(previous));

  if (solved === null) {
    return <DropChallenge first={firstQuestion} onPass={setSolved} />;
  }

  return (
    <>
      <LuckyBox
        title={title}
        left={left}
        previous={previous}
        solved={solved}
        onOpened={() => setOpened(true)}
      />
      {opened && <HomeMissionCard initial={offer} />}
    </>
  );
}
