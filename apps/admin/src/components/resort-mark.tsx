import Image from "next/image";
import { resortPhoto } from "@/lib/resorts";
import { cn } from "@/lib/utils";

/** A small square for a resort: its photo, or its code on green when it has none. */
export function ResortMark({ code, className }: { code: string; className?: string }) {
  const photo = resortPhoto[code];
  return (
    <span className={cn("relative flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-[0.65rem] font-bold tracking-wide text-primary-foreground", className)}>
      {photo ? <Image src={photo} alt="" fill sizes="48px" className="object-cover" /> : code}
    </span>
  );
}

/** The group's own mark, for pages that cover every resort. */
export function GroupMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm", className)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* Two hills and a sun: the Sahyadri, where all four resorts are. */}
        <path d="M2.5 19.5 9 10l3.6 5.2" />
        <path d="m10.8 19.5 4.7-7 6 7" />
        <path d="M2.5 19.5h19" />
        <circle cx="16.5" cy="6" r="2" />
      </svg>
    </span>
  );
}
