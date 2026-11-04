/**
 * A price in rupees. Besley, the display face, has no rupee sign, so the
 * sign is set in the text face and the figures stay in whatever face surrounds them.
 */
export function Money({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      <span className="font-sans font-medium">₹</span>
      {amount.toLocaleString("en-IN")}
    </span>
  );
}
