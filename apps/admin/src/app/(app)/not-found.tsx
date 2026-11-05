import Link from "next/link";
import { LayoutGrid, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** A booking, resort or page that isn't there, or isn't at a resort this person works at. */
export default function NotFound() {
  return (
    <Empty className="min-h-[60svh] border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>Not found</EmptyTitle>
        <EmptyDescription>That booking or page doesn&apos;t exist, or it belongs to a resort you don&apos;t work at.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button asChild>
          <Link href="/">
            <LayoutGrid />
            Your resorts
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/search">
            <Search />
            Find a booking
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
