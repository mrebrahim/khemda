export const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
] as const;

/** سنة الخدمة بتبدأ من أكتوبر وتنتهي سبتمبر */
export const SERVICE_YEAR_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function monthName(m: number): string {
  return MONTH_NAMES_AR[m - 1] ?? String(m);
}

/** "2026-10" */
export function currentMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export function isValidMonth(ym: string | undefined): ym is string {
  return !!ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

/** أول يوم في الشهر وأول يوم في الشهر اللي بعده */
export function monthRange(ym: string): { start: string; endExclusive: string } {
  const [y, m] = ym.split("-").map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${y}-${pad(m)}-01`,
    endExclusive: `${nextY}-${pad(nextM)}-01`,
  };
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${monthName(m)} ${y}`;
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const nextY = Math.floor(total / 12);
  const nextM = (total % 12) + 1;
  return `${nextY}-${String(nextM).padStart(2, "0")}`;
}

/**
 * سنة الخدمة اللي الشهر ده واقع فيها.
 * أكتوبر ٢٠٢٦ لحد سبتمبر ٢٠٢٧ = سنة خدمة واحدة.
 */
export function serviceYearOf(ym: string): { startYear: number; label: string } {
  const [y, m] = ym.split("-").map(Number);
  const startYear = m >= 10 ? y : y - 1;
  return { startYear, label: `${startYear} – ${startYear + 1}` };
}
