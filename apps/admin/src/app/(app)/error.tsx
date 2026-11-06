"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** A page that failed to load, such as when the database can't be reached. Trying again reloads just the page. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Empty className="min-h-[60svh] border border-dashed border-destructive/30">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>This page didn&apos;t load</EmptyTitle>
        <EmptyDescription>
          Something went wrong on our side. Try again; if it keeps happening, tell your Super Admin
          {error.digest ? ` and quote ${error.digest}` : ""}.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
