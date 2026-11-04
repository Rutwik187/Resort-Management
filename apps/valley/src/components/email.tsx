/**
 * An email address that may wrap after the @. Valley's addresses are long
 * (wedding@prathameshvalleyresorts.com), so on a narrow phone they would
 * otherwise push the page wider than the screen. Give the link
 * [overflow-wrap:anywhere] too, so even the domain breaks when it must.
 */
export function Email({ address }: { address: string }) {
  const at = address.indexOf("@");
  return (
    <>
      {address.slice(0, at + 1)}
      <wbr />
      {address.slice(at + 1)}
    </>
  );
}
