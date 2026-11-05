import { cookies } from "next/headers";
import { accessibleProperties, can } from "@repo/auth";
import type { Permission } from "@repo/db";
import { getDb } from "@repo/db";
import { properties as sites } from "@repo/sites";
import { AppSidebar, type Section, type SidebarData } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireStaffPage } from "@/lib/staff";

/** Each resort section, and the permissions that open it (any one is enough). */
const sections: [Section["key"], string, Permission[]][] = [
  ["today", "Today", ["dashboard.view"]],
  ["bookings", "Bookings", ["bookings.view"]],
  ["calendar", "Calendar", ["inventory.view"]],
  ["rooms", "Rooms", ["rooms.manage", "inventory.view"]],
  ["prices", "Prices", ["prices.view"]],
  ["packages", "Packages", ["prices.view"]],
  ["settings", "Settings", ["settings.manage"]],
];

/** Every signed-in page: the sidebar with this person's resorts and sections, and the bar on top. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaffPage();
  const resorts = await accessibleProperties(getDb(), staff);
  const data: SidebarData = {
    resorts: resorts.map((resort) => {
      const site = sites.find((s) => s.code === resort.code);
      return {
        code: resort.code,
        name: resort.name,
        shortName: site?.shortName ?? resort.name,
        place: site?.place ?? "",
        website: site?.url ?? "",
        canBook: can(staff, "bookings.create", resort.id),
        sections: sections.filter(([, , needs]) => needs.some((permission) => can(staff, permission, resort.id))).map(([key, label]) => ({ key, label })),
      };
    }),
    group: [...(can(staff, "users.manage") ? [{ key: "staff" as const, label: "Staff" }] : []), ...(can(staff, "audit.view") ? [{ key: "audit" as const, label: "Audit log" }] : [])],
    user: { name: staff.name, email: staff.email, role: staff.role.name, image: staff.image },
  };
  // The sidebar remembers whether it was open, so it doesn't jump on the next page.
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar data={data} />
      <SidebarInset className="min-w-0 md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-sidebar-border">
        <SiteHeader resorts={data.resorts.map(({ code, shortName }) => ({ code, shortName }))} canSearch={can(staff, "bookings.view")} />
        <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 print:p-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
