import Image from "next/image";
import logoFull from "@/assets/brand/logo-full.png";
import logoFullOnDark from "@/assets/brand/logo-full-on-dark.png";
import logoMark from "@/assets/brand/logo-mark.png";

/*
 * The park's own logo, cut from the current site's file. Every version leaves
 * out its small "Pure veg resort" badge: the park now serves veg and non-veg
 * food from separate kitchens.
 */
const variants = {
  /** Without the "Adventure park" line, which is unreadable at header size. */
  mark: logoMark,
  full: logoFull,
  /** The full logo with "Adventure park" in light ink, for dark backgrounds. */
  fullOnDark: logoFullOnDark,
};

type LogoProps = {
  variant?: keyof typeof variants;
  sizes: string;
  className?: string;
  /** Leave empty when the logo sits inside a link that already names the park. */
  alt?: string;
  preload?: boolean;
};

export function Logo({ variant = "mark", sizes, className = "", alt = "Prathamesh Go Crazy Resort, Sinhagad Fort, Donje", preload }: LogoProps) {
  return <Image src={variants[variant]} alt={alt} sizes={sizes} preload={preload} className={`h-auto ${className}`} />;
}
