import Link from "next/link";
import { accessibleProperties, can } from "@repo/auth";
import { getDb } from "@repo/db";
import { requireStaffPage } from "@/lib/staff";
import { SignOutButton } from "./sign-out-button";

/** Every signed-in page: the resorts this person may open, their name and role, and sign out. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaffPage();
  const resorts = await accessibleProperties(getDb(), staff);

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/" className="font-semibold">
              Prathamesh admin
            </Link>
            <nav aria-label="Resorts" className="flex flex-wrap gap-1">
              {resorts.map((resort) => (
                <Link key={resort.id} href={`/${resort.code.toLowerCase()}/rooms`} className="rounded-md px-2.5 py-1.5 text-[0.88rem] text-muted hover:bg-page hover:text-ink">
                  {resort.name}
                </Link>
              ))}
            </nav>
            {can(staff, "users.manage") && (
              <Link href="/staff" className="rounded-md px-2.5 py-1.5 text-[0.88rem] text-muted hover:bg-page hover:text-ink">
                Staff
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 text-[0.88rem]">
            <span className="text-muted">
              {staff.name} · {staff.role.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
