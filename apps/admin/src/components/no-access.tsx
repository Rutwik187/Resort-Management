import { Lock } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** What a page shows to someone whose role doesn't cover it. The sidebar hides such pages, so this is only reached by address. */
export function NoAccess({ what }: { what: string }) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Lock />
        </EmptyMedia>
        <EmptyTitle>Not open to your role</EmptyTitle>
        <EmptyDescription>Your role can&apos;t see {what} at this resort. Ask your Super Admin if you need to.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
