/** شرارات مضيئة في الخلفية — مواضع ثابتة عشان السيرفر والكلاينت يطلعوا نفس الشكل */
const SPARKS = [
  { l: 6, b: 4, d: 0, s: 7, c: "#ffd166" },
  { l: 16, b: 12, d: 1.4, s: 8, c: "#22d3ee" },
  { l: 27, b: 2, d: 2.6, s: 6.4, c: "#ffd166" },
  { l: 38, b: 18, d: 0.8, s: 9, c: "#ffffff" },
  { l: 47, b: 6, d: 3.4, s: 7.6, c: "#ffd166" },
  { l: 56, b: 14, d: 2.0, s: 8.4, c: "#a78bfa" },
  { l: 66, b: 3, d: 4.2, s: 6.8, c: "#ffd166" },
  { l: 75, b: 16, d: 1.1, s: 9.4, c: "#22d3ee" },
  { l: 85, b: 8, d: 3.0, s: 7.2, c: "#ffd166" },
  { l: 93, b: 20, d: 2.2, s: 8.8, c: "#ffffff" },
];

export default function Sparks() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
      {SPARKS.map((p, i) => (
        <span
          key={i}
          className="spark"
          style={{
            left: `${p.l}%`,
            bottom: `${p.b}%`,
            background: p.c,
            boxShadow: `0 0 8px 2px ${p.c}aa`,
            animationDelay: `${p.d}s`,
            animationDuration: `${p.s}s`,
          }}
        />
      ))}
    </div>
  );
}
