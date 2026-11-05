import Link from "next/link";
import { GroupMark } from "@/components/resort-mark";
import { Button } from "@/components/ui/button";

/** An address that matches no page at all. */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6 text-center">
      <GroupMark className="size-10" />
      <div className="grid gap-2">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Check the address, or go back to the admin.</p>
      </div>
      <Button asChild>
        <Link href="/">Go to the admin</Link>
      </Button>
    </main>
  );
}
