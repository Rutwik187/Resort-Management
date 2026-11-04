import Link from "next/link";
import { can } from "@repo/auth";
import { ResortTabs } from "@/components/nav";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";

/** One resort: its name, the sections this person may open, and a new booking. */
export default async function ResortLayout({ children, params }: LayoutProps<"/[property]">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  const base = `/${property.code.toLowerCase()}`;
  const allowed = (...permissions: Parameters<typeof can>[1][]) => permissions.some((permission) => can(staff, permission, property.id));

  const tabs = [
    { href: base, label: "Today", segment: null, show: allowed("dashboard.view") },
    { href: `${base}/bookings`, label: "Bookings", segment: "bookings", show: allowed("bookings.view") },
    { href: `${base}/calendar`, label: "Calendar", segment: "calendar", show: allowed("inventory.view") },
    { href: `${base}/rooms`, label: "Rooms", segment: "rooms", show: allowed("rooms.manage", "inventory.view") },
    { href: `${base}/prices`, label: "Prices", segment: "prices", show: allowed("prices.view") },
    { href: `${base}/packages`, label: "Packages", segment: "packages", show: allowed("prices.view") },
    { href: `${base}/settings`, label: "Settings", segment: "settings", show: allowed("settings.manage") },
  ].filter((tab) => tab.show);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <p className="text-[0.75rem] font-semibold tracking-[0.12em] text-muted">{property.code}</p>
          <p className="mt-0.5 text-[1.35rem] font-semibold leading-tight">{property.name}</p>
        </div>
        {allowed("bookings.create") && (
          <Link href={`${base}/bookings/new`} className="button">
            New booking
          </Link>
        )}
      </div>
      <div className="print:hidden">
        <ResortTabs tabs={tabs.map(({ href, label, segment }) => ({ href, label, segment }))} />
      </div>
      <div className="mt-6 print:mt-0">{children}</div>
    </div>
  );
}
