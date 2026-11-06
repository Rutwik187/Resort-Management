"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const labels: Record<string, string> = {
  bookings: "Bookings",
  leads: "Leads",
  guests: "Guests",
  new: "New booking",
  calendar: "Calendar",
  log: "Inventory log",
  reports: "Reports",
  rooms: "Rooms",
  prices: "Prices",
  packages: "Packages",
  offers: "Offers",
  settings: "Settings",
  staff: "Staff",
  audit: "Audit log",
  search: "Find a booking",
};

/** The bar above every page: the sidebar toggle, where you are, and the booking search. */
export function SiteHeader({ resorts, canSearch }: { resorts: { code: string; shortName: string }[]; canSearch: boolean }) {
  const segments = usePathname().split("/").filter(Boolean);
  const search = useRef<HTMLInputElement>(null);
  const resort = resorts.find((r) => r.code.toLowerCase() === segments[0]);
  const crumbs: { label: string; href: string }[] = [];
  if (resort) {
    crumbs.push({ label: resort.shortName, href: `/${segments[0]}` });
    crumbs.push({ label: segments[1] ? (labels[segments[1]] ?? segments[1]) : "Today", href: segments[1] ? `/${segments[0]}/${segments[1]}` : `/${segments[0]}` });
    if (segments[2]) crumbs.push({ label: segments[1] === "leads" ? "Lead" : segments[1] === "guests" ? "Guest" : (labels[segments[2]] ?? segments[2].toUpperCase()), href: `/${segments.slice(0, 3).join("/")}` });
  } else {
    crumbs.push({ label: segments[0] ? (labels[segments[0]] ?? segments[0]) : "All resorts", href: `/${segments[0] ?? ""}` });
  }

  // "/" jumps to the search from anywhere, unless someone is typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || target.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:rounded-t-xl print:hidden">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.href + i}>
              {i > 0 && <BreadcrumbSeparator className={i < crumbs.length - 1 ? "hidden md:block" : undefined} />}
              <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden md:inline-flex" : "truncate"}>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
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
        <Button variant="ghost" size="icon" asChild className="ml-auto size-9 sm:hidden">
          <Link href="/search" aria-label="Find a booking">
            <Search />
          </Link>
        </Button>
      )}
      {canSearch && (
        <form action="/search" role="search" className="ml-auto hidden w-full max-w-72 sm:block">
          <InputGroup className="h-9 bg-muted/40 shadow-none">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput ref={search} id="header-search" name="q" type="search" placeholder="Number, phone or name" aria-label="Find a booking by number, phone or name" />
            <InputGroupAddon align="inline-end" className="hidden sm:flex">
              <kbd className="pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border bg-background px-1 font-mono text-[0.7rem] font-medium text-muted-foreground">/</kbd>
            </InputGroupAddon>
          </InputGroup>
        </form>
      )}
    </header>
  );
}
