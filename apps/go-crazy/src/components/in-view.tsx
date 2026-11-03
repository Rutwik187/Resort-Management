"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ElementType } from "react";

type InViewProps<T extends ElementType> = {
  as?: T;
  /**
   * How far into the screen (0 to 1) the top of the block must travel before
   * it reveals. Measured from the top edge, so very tall blocks still reveal.
   */
  amount?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/**
 * Marks a block with data-inview="true" the first time it scrolls into view.
 * The reveal itself is plain CSS (see .snap, .up, .wipe, .grow-x in globals.css),
 * so it runs once and costs nothing after it has played.
 */
export function InView<T extends ElementType = "div">({ as, amount = 0.2, ...rest }: InViewProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: `0px 0px -${Math.round(5 + amount * 22)}% 0px` },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [amount, seen]);

  return <Tag ref={ref} data-inview={seen ? "true" : "false"} {...rest} />;
}

/**
 * A headline set one line per string. Each line arrives a little wider and
 * pulls tight to the condensed display width. Lines never wrap; long ones make the whole headline smaller.
 */
export function SnapLines({ lines, start = 0 }: { lines: string[]; start?: number }) {
  // The longest line sets the size of every line, so the headline fits its column (see .snap).
  const longest = Math.max(...lines.map((line) => line.length));
  return (
    <>
      {lines.map((line, i) => (
        <span key={line} className="snap" style={{ "--i": start + i, "--n": longest } as React.CSSProperties}>
          {line}
        </span>
      ))}
    </>
  );
}
