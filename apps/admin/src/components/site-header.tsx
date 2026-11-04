"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const labels: Record<string, string> = {
  bookings: "Bookings",
  new: "New booking",
  calendar: "Calendar",
  log: "Inventory log",
  rooms: "Rooms",
  prices: "Prices",
  packages: "Packages",
  settings: "Settings",
  staff: "Staff",
  audit: "Audit log",
  search: "Find a booking",
};

/** The bar above every page: the sidebar toggle, where you are, and the booking search. */
export function SiteHeader({ resorts, canSearch }: { resorts: { code: string; shortName: string }[]; canSearch: boolean }) {
  const segments = usePathname().split("/").filter(Boolean);
  const resort = resorts.find((r) => r.code.toLowerCase() === segments[0]);
  const crumbs: { label: string; href: string }[] = [];
  if (resort) {
    crumbs.push({ label: resort.shortName, href: `/${segments[0]}` });
    crumbs.push({ label: segments[1] ? (labels[segments[1]] ?? segments[1]) : "Today", href: segments[1] ? `/${segments[0]}/${segments[1]}` : `/${segments[0]}` });
    if (segments[2]) crumbs.push({ label: labels[segments[2]] ?? segments[2].toUpperCase(), href: `/${segments.slice(0, 3).join("/")}` });
  } else {
    crumbs.push({ label: segments[0] ? (labels[segments[0]] ?? segments[0]) : "All resorts", href: `/${segments[0] ?? ""}` });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 print:hidden">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.href + i}>
              {i > 0 && <BreadcrumbSeparator className={i < crumbs.length - 1 ? "hidden md:block" : undefined} />}
              <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden md:inline-flex" : "truncate"}>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {canSearch && (
        <form action="/search" role="search" className="ml-auto w-full max-w-64">
          <InputGroup className="h-9">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput id="header-search" name="q" type="search" placeholder="Number, phone or name" aria-label="Find a booking" />
          </InputGroup>
        </form>
      )}
    </header>
  );
}
