export default function NotConfigured() {
  return (
    <div className="max-w-md mx-auto mt-8 bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center">
      <div className="text-4xl mb-3">⚙️</div>
      <h2 className="font-bold text-amber-900 text-lg">الكود السري مش متظبّط</h2>
      <p className="text-amber-800 text-sm mt-2 leading-relaxed">
        سكشن الخدام مقفول لحد ما يتحط متغيّر البيئة{" "}
        <code className="bg-amber-100 rounded px-1.5 py-0.5 font-mono text-xs" dir="ltr">
          SERVANTS_PASSCODE
        </code>{" "}
        في إعدادات Vercel، وبعدها يتعمل Redeploy.
      </p>
    </div>
  );
}
