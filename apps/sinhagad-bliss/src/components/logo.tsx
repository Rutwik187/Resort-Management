import Image from "next/image";
import logoMark from "@/assets/brand/logo-mark.png";
import logoOnDark from "@/assets/brand/logo-on-dark.png";

const variants = {
  /** The fort-gate emblem and the name, without "A Mountain View Resort", which is unreadable at header size. */
  mark: logoMark,
  /** The full logo, its tagline turned light for dark backgrounds. */
  fullOnDark: logoOnDark,
};

type LogoProps = {
  variant?: keyof typeof variants;
  sizes: string;
  className?: string;
  /** Leave empty when the logo sits inside a link that already names the resort. */
  alt?: string;
  preload?: boolean;
};

/** The resort's own logo, trimmed to its edges. */
export function Logo({ variant = "mark", sizes, className = "", alt = "Sinhagad Bliss", preload }: LogoProps) {
  return <Image src={variants[variant]} alt={alt} sizes={sizes} preload={preload} className={`h-auto ${className}`} />;
}
