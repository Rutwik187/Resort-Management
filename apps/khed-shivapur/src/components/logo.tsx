import Image from "next/image";
import logo from "@/assets/brand/logo.png";
import logoMark from "@/assets/brand/logo-mark.png";
import logoOnDark from "@/assets/brand/logo-on-dark.png";

const variants = {
  /** Without the "Breathe | Relax | Enjoy" line, which is unreadable at header size. */
  mark: logoMark,
  full: logo,
  /** The full logo with the tagline in light ink, for dark backgrounds. */
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

/** The resort's own logo, cut out of its white square and cropped tight. */
export function Logo({ variant = "mark", sizes, className = "", alt = "Prathamesh Resorts", preload }: LogoProps) {
  return <Image src={variants[variant]} alt={alt} sizes={sizes} preload={preload} className={`h-auto ${className}`} />;
}
