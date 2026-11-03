/**
 * A label that rolls on hover: the text slides up and a copy slides in
 * from below (see .roll in globals.css). The copy is hidden from screen readers.
 */
export function Roll({ children }: { children: string }) {
  return (
    <span className="roll">
      <span>{children}</span>
      <span aria-hidden>{children}</span>
    </span>
  );
}
