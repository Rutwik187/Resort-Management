import Link from "next/link";
import { accessibleProperties, can } from "@repo/auth";
import { getDb } from "@repo/db";
import { properties as sites } from "@repo/sites";
import { HeaderNav } from "@/components/nav";
import { requireStaffPage } from "@/lib/staff";
import { SignOutButton } from "./sign-out-button";

/** Every signed-in page: the resorts this person may open, one search box, their name and role, and sign out. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaffPage();
  const resorts = await accessibleProperties(getDb(), staff);
  const extra = [...(can(staff, "users.manage") ? [{ href: "/staff", label: "Staff" }] : [])];

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card print:hidden">
        {/* One row from md up. On phones: name and sign out, then the resorts, then search. */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 md:flex-nowrap">
          <Link href="/" className="order-1 shrink-0 font-semibold">
            Prathamesh admin
          </Link>
          <div className="order-3 min-w-0 basis-full md:order-2 md:flex-1 md:basis-auto">
            <HeaderNav resorts={resorts.map(({ code, name }) => ({ code, name: sites.find((site) => site.code === code)?.shortName ?? name }))} extra={extra} />
          </div>
          {can(staff, "bookings.view") && (
            <form action="/search" role="search" className="order-4 basis-full md:order-3 md:basis-auto">
              <label htmlFor="header-search" className="sr-only">
                Find a booking
              </label>
              <input id="header-search" name="q" type="search" placeholder="Number, phone or name" className="field min-h-9 py-1 md:w-60" />
            </form>
          )}
          <div className="order-2 ml-auto flex shrink-0 items-center gap-3 text-[0.88rem] md:order-4 md:ml-0">
            <span className="text-muted">
              {staff.name}
              <span className="hidden xl:inline"> · {staff.role.name}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
