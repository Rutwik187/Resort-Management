import Image from "next/image";
import type { ReactNode } from "react";
import emblem from "@/assets/brand/emblem.png";

/**
 * A postage stamp with perforated edges (see .stamp in globals.css).
 * Without children it carries the sunset from the logo.
 */
export function Stamp({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div aria-hidden={children ? undefined : true} className={`stamp bg-mist ${className}`}>
      <div className="flex h-full flex-col items-center justify-center bg-cloud px-2 py-2.5 text-center">
        {children ?? <Image src={emblem} alt="" sizes="96px" className="h-auto w-[78%]" />}
      </div>
    </div>
  );
}

/**
 * A round postmark: the place around the ring, a short word in the middle,
 * and the wavy cancellation lines beside it. Decorative only. Give each
 * postmark on a page its own id, for the path its ring text follows.
 */
export function Postmark({ id, ring, center, className = "" }: { id: string; ring: string; center: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 120" className={`overflow-visible ${className}`} fill="none" stroke="currentColor">
      <defs>
        <path id={`ring-${id}`} d="M 60 60 m -42 0 a 42 42 0 1 1 84 0 a 42 42 0 1 1 -84 0" />
      </defs>
      <circle cx="60" cy="60" r="54" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="31" strokeWidth="1" />
      <text fill="currentColor" stroke="none" fontSize="10.5" fontWeight="600" letterSpacing="2.2">
        <textPath href={`#ring-${id}`} startOffset="0">
          {ring}
        </textPath>
      </text>
      {/* Shrunk to fit inside the inner ring, which is about 52 units wide. */}
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize={Math.min(11, 74 / Math.max(1, center.length))}
        fontWeight="600"
        letterSpacing="0.6"
      >
        {center}
      </text>
      {[34, 48, 62, 76, 90].map((y) => (
        <path key={y} d={`M 122 ${y} q 9 -7 18 0 t 18 0 t 18 0 t 18 0`} strokeWidth="1.5" />
      ))}
    </svg>
  );
}
