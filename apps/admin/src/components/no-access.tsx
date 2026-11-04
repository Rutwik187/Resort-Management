/** What a page shows to someone whose role doesn't cover it. Tabs hide such pages, so this is only reached by address. */
export function NoAccess({ what }: { what: string }) {
  return (
    <div className="card p-6">
      <h1 className="text-[1.2rem] font-semibold">Not open to your role</h1>
      <p className="mt-1 text-muted">Your role can&apos;t see {what} at this resort. Ask your Super Admin if you need to.</p>
    </div>
  );
}
