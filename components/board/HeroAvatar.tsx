import Image from "next/image";
import { avatarFor } from "@/lib/assets";

/**
 * أفاتار البطل — صورة WebP شفافة من public/assets/gaming.
 * كل ولد بياخد نفس الصورة دايمًا حسب رقمه، ولو بقى للولد صورة خاصة
 * بعدين ابعتها في prop اسمه src.
 */
export default function HeroAvatar({
  seed,
  size = 44,
  color = "#f2a900",
  src,
  priority = false,
}: {
  seed: number;
  size?: number;
  color?: string;
  src?: string | null;
  priority?: boolean;
}) {
  return (
    <Image
      src={src || avatarFor(seed)}
      alt=""
      width={size}
      height={size}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      aria-hidden="true"
      className="b-avatar object-cover"
      style={{ width: size, height: size, borderColor: `${color}88` }}
    />
  );
}
