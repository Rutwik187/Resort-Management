import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A person's Google photo, or their initials on pale green. */
export function PersonAvatar({ name, image, className }: { name: string; image?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-8 rounded-lg", className)}>
      {image && <AvatarImage src={image} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className="rounded-[inherit] bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
