/**
 * أفاتار البطل — SVG متولّد من رقم الولد نفسه، فكل واحد شكله ثابت ومختلف.
 * لو اتوفّرت صور شخصيات جاهزة بعدين، ابعتها في prop اسمه src
 * (حطها في public/assets/leaderboard) وهتظهر مكان الرسمة.
 */
const SKIN = ["#f1c39a", "#e0a97a", "#c88a5c", "#a9693f", "#8a5230"];
const HAIR = ["#2b1b12", "#4a2c1a", "#1f2937", "#5b3a29", "#111827"];
const SUIT = ["#1d4ed8", "#b91c1c", "#047857", "#6d28d9", "#c2410c", "#0f766e"];

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[Math.abs((seed * 31 + salt * 17) % arr.length)];
}

export default function HeroAvatar({
  seed,
  size = 44,
  color = "#f2a900",
  src,
  crown = false,
}: {
  seed: number;
  size?: number;
  color?: string;
  src?: string | null;
  crown?: boolean;
}) {
  const skin = pick(SKIN, seed, 1);
  const hair = pick(HAIR, seed, 2);
  const suit = pick(SUIT, seed, 3);
  const cap = seed % 3 === 0;
  const shades = seed % 4 === 0;
  const id = `av${seed}`;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="b-avatar object-cover"
        style={{ width: size, height: size, borderColor: `${color}88` }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="b-avatar shrink-0"
      style={{ borderColor: `${color}88` }}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="28%" r="78%">
          <stop offset="0%" stopColor={`${color}66`} />
          <stop offset="100%" stopColor="#0b0e13" />
        </radialGradient>
      </defs>

      <rect width="64" height="64" fill={`url(#${id}bg)`} />

      {/* الأكتاف */}
      <path d="M8 64c0-13 10.7-19 24-19s24 6 24 19z" fill={suit} />
      <path d="M26 45h12l-6 9z" fill="#ffffff" opacity=".85" />

      {/* الرقبة والوش */}
      <rect x="27" y="36" width="10" height="8" rx="3" fill={skin} />
      <ellipse cx="32" cy="27" rx="13" ry="14" fill={skin} />

      {/* الشعر أو الكاب */}
      {cap ? (
        <>
          <path d="M19 22c0-8 5.8-12 13-12s13 4 13 12z" fill={suit} />
          <path d="M45 22H19c-2 0-3 1-3 2.5h32c0-1.5-1-2.5-3-2.5z" fill={hair} />
        </>
      ) : (
        <path d="M19 25c-1-10 5-16 13-16s14 6 13 16c-1-5-4-7-8-8-3 2-11 2-14 0-2 1.5-3.4 4-4 8z" fill={hair} />
      )}

      {/* العينين */}
      {shades ? (
        <>
          <rect x="21" y="24" width="22" height="7" rx="3" fill="#0b0e13" />
          <rect x="22.5" y="25.5" width="7" height="3" rx="1.5" fill={color} opacity=".7" />
        </>
      ) : (
        <>
          <circle cx="27" cy="27" r="1.9" fill="#0b0e13" />
          <circle cx="37" cy="27" r="1.9" fill="#0b0e13" />
        </>
      )}

      {/* ابتسامة */}
      <path d="M28 33q4 3.2 8 0" stroke="#0b0e13" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {crown && (
        <path
          d="M22 13l4 4 6-7 6 7 4-4v6H22z"
          fill="#f2a900"
          stroke="#7c4a03"
          strokeWidth="0.8"
        />
      )}
    </svg>
  );
}
