"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-brand-600 text-white px-4 py-2 font-bold hover:bg-brand-700 transition"
    >
      🖨️ اطبع الكروت
    </button>
  );
}
