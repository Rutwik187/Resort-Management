import Image from "next/image";
import logo from "@/assets/brand/logo.png";
import logoMark from "@/assets/brand/logo-mark.png";

const variants = {
  /** Without the "Breathe | Relax | Enjoy" line, which is unreadable at header size. */
  mark: logoMark,
  /** The full logo, with the line, for the footer. */
  full: logo,
};

type LogoProps = {
  variant?: keyof typeof variants;
  sizes: string;
  className?: string;
  /** Leave empty when the logo sits inside a link that already names the resort. */
  alt?: string;
  preload?: boolean;
};

/** The resort's own logo, trimmed and saved at twice its display size. */
export function Logo({ variant = "mark", sizes, className = "", alt = "Prathamesh Valley Resorts", preload }: LogoProps) {
  return <Image src={variants[variant]} alt={alt} sizes={sizes} preload={preload} className={`h-auto ${className}`} />;
}
