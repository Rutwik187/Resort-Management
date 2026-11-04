import { currentOffer } from "@/content/resort";

/** The current offer as a round stamp. Renders nothing when no offer is active. */
export function OfferStamp({ className = "" }: { className?: string }) {
  if (!currentOffer) return null;
  return (
    <aside
      aria-label="Current offer"
      className={`flex size-40 shrink-0 rotate-[-7deg] flex-col items-center justify-center rounded-full bg-sun p-5 text-center text-ink shadow-[0_0_0_4px_var(--color-sun),0_0_0_6px_var(--color-ink)] md:size-44 ${className}`}
    >
      <span className="label text-[0.66rem]">Offer</span>
      <span className="display mt-1 text-[1.65rem] leading-[0.86] md:text-[1.8rem]">{currentOffer.title}</span>
    </aside>
  );
}
