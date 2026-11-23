import "server-only";
import { GalleryGrid } from "@repo/booking-ui/gallery-grid";
import type { PropertyCode } from "@repo/sites";
import { liveGallery } from "./index";

/** The resort's gallery from the admin, or a short note while it is empty (URD 4.2). */
export async function SiteGallery({ code, empty }: { code: PropertyCode; empty: React.ReactNode }) {
  const photos = await liveGallery(code);
  if (!photos.length) return <div className="rounded-bk border border-dashed border-bk-line p-8 text-bk-muted">{empty}</div>;
  return <GalleryGrid photos={photos} />;
}
