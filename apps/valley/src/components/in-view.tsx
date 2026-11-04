"use client";

import { Fragment, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ElementType } from "react";

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
 * The reveal itself is plain CSS (see .word, .fade, .lift, .draw-x in globals.css),
 * so it runs on the compositor and costs nothing after it has played.
 */
export function InView<T extends ElementType = "div">({ as, amount = 0.25, ...rest }: InViewProps<T>) {
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
      { threshold: 0, rootMargin: `0px 0px -${Math.round(6 + amount * 24)}% 0px` },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [amount, seen]);

  return <Tag ref={ref} data-inview={seen ? "true" : "false"} {...rest} />;
}

/**
 * Splits a heading into words that drift up into place one after another.
 * Wrap a word, or several, in *asterisks* to set them in the warm italic.
 */
export function Words({ text, start = 0 }: { text: string; start?: number }) {
  const words = splitWords(text);
  return (
    <>
      {words.map(({ word, italic }, i) => {
        const style = { "--i": start + i } as React.CSSProperties;
        return (
          <Fragment key={i}>
            {italic ? (
              <em className="word" style={style}>
                {word}
              </em>
            ) : (
              <span className="word" style={style}>
                {word}
              </span>
            )}
            {i < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </>
  );
}

/** The words of a heading, each marked italic when it falls between stars: "*here*" or "*Western Ghats*". */
function splitWords(text: string) {
  let inside = false;
  return text.split(" ").map((raw) => {
    const italic = inside || raw.startsWith("*");
    inside = italic && !/\*[.,!?]?$/.test(raw);
    return { word: raw.replace(/^\*/, "").replace(/\*(?=[.,!?]?$)/, ""), italic };
  });
}
