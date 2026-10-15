"use client";

import { usePathname, useRouter } from "next/navigation";
import { TUTORIAL_EVENT } from "@/components/Tutorial";

/** زرار يرجّع الشرح تاني — الشرح عايش على الصفحة الرئيسية */
export default function TutorialButton() {
  const router = useRouter();
  const path = usePathname();

  return (
    <button
      type="button"
      aria-label="إزاي السيستم بيشتغل؟"
      title="إزاي السيستم بيشتغل؟"
      onClick={() => {
        if (path !== "/hero") {
          router.push("/hero");
          // نستنى الصفحة تفتح الأول
          setTimeout(() => window.dispatchEvent(new Event(TUTORIAL_EVENT)), 600);
        } else {
          window.dispatchEvent(new Event(TUTORIAL_EVENT));
        }
      }}
      className="text-xs bg-white/10 border border-white/15 px-2 py-1 hover:bg-white/20 transition"
    >
      ❓
    </button>
  );
}
