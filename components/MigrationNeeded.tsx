/** بيظهر لو جدول لسه ما اتعملش في الداتابيز */
export default function MigrationNeeded({ file }: { file: string }) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
      <h2 className="font-bold text-amber-900">⚙️ الداتابيز محتاجة خطوة واحدة</h2>
      <p className="text-amber-800 text-sm mt-2 leading-relaxed">
        جداول التسجيل لسه ما اتعملتش. افتح SQL Editor في سوپابيز والصق محتوى
        الملف{" "}
        <code className="bg-amber-100 rounded px-1.5 py-0.5 font-mono text-xs" dir="ltr">
          {file}
        </code>{" "}
        وشغّله مرة واحدة، وبعدها الصفحة دي هتشتغل عادي.
      </p>
    </div>
  );
}
