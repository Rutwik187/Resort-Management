import "server-only";
import { Suspense } from "react";
import { SiteNoticeCard } from "@repo/booking-ui/notice";
import type { PropertyCode } from "@repo/sites";
import { liveNotices } from "./index";

async function Notices({ code }: { code: PropertyCode }) {
  const notices = await liveNotices(code);
  return notices.length ? <SiteNoticeCard notices={notices} /> : null;
}

/**
 * The resort's notice from the admin, such as "The pool is closed on 12
 * November", for the site's layout. It is read with the catalogue, so the
 * admin refreshes it the same way, and it never holds up the page.
 */
export function SiteNotices({ code }: { code: PropertyCode }) {
  return (
    <Suspense fallback={null}>
      <Notices code={code} />
    </Suspense>
  );
}
