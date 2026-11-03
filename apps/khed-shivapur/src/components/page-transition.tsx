import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps a page so that moving between pages plays one transition: the old
 * page sinks back as the new one rises over it (see "Page transitions" in
 * globals.css). It sits in each page, not the layout, because layouts stay
 * mounted between pages and would never enter or exit.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
