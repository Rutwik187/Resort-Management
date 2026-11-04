"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChevronsUpDown,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Plus,
  ScrollText,
  Settings,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

/** A resort section. Icons are named, because a server can't hand a component to the browser. */
export type Section = { key: "today" | "bookings" | "calendar" | "rooms" | "prices" | "packages" | "settings"; label: string };
export type SidebarResort = { code: string; name: string; shortName: string; sections: Section[]; canBook: boolean };
export type SidebarData = {
  resorts: SidebarResort[];
  group: { key: "staff" | "audit"; label: string }[];
  user: { name: string; email: string; role: string };
};

const sectionIcon: Record<Section["key"], LucideIcon> = {
  today: LayoutDashboard,
  bookings: ClipboardList,
  calendar: CalendarDays,
  rooms: BedDouble,
  prices: IndianRupee,
  packages: Ticket,
  settings: Settings,
};
const groupIcon = { staff: Users, audit: ScrollText } as const;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

/** The admin's sidebar: which resort, its sections, pages for the whole group, and who is signed in. */
export function AppSidebar({ data }: { data: SidebarData }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const current = data.resorts.find((resort) => resort.code.toLowerCase() === segments[0]);
  const section = segments[1] ?? "today";
  const { isMobile, setOpenMobile } = useSidebar();
  const close = () => isMobile && setOpenMobile(false);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <ResortSwitcher resorts={data.resorts} current={current} />
      </SidebarHeader>

      <SidebarContent>
        {current?.canBook && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="New booking"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                  >
                    <Link href={`/${current.code.toLowerCase()}/bookings/new`} onClick={close}>
                      <Plus />
                      <span>New booking</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {current ? (
          <SidebarGroup>
            <SidebarGroupLabel>{current.shortName}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {current.sections.map((item) => {
                  const Icon = sectionIcon[item.key];
                  const href = `/${current.code.toLowerCase()}${item.key === "today" ? "" : `/${item.key}`}`;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild isActive={section === item.key} tooltip={item.label}>
                        <Link href={href} onClick={close}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Resorts</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.resorts.map((resort) => (
                  <SidebarMenuItem key={resort.code}>
                    <SidebarMenuButton asChild tooltip={resort.name}>
                      <Link href={`/${resort.code.toLowerCase()}`} onClick={close}>
                        <Building2 />
                        <span>{resort.shortName}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {data.group.length > 0 && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Prathamesh Group</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.group.map((item) => {
                  const Icon = groupIcon[item.key];
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild isActive={segments[0] === item.key} tooltip={item.label}>
                        <Link href={`/${item.key}`} onClick={close}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** The resort being worked on, and a menu to move to another one or to the overview of all. */
function ResortSwitcher({ resorts, current }: { resorts: SidebarResort[]; current: SidebarResort | undefined }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-[0.7rem] font-bold tracking-wide text-sidebar-primary-foreground">
                {current?.code ?? "PG"}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{current?.name ?? "Prathamesh Group"}</span>
                <span className="truncate text-xs text-muted-foreground">{current ? "Admin" : "All resorts"}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg" align="start" side={isMobile ? "bottom" : "right"} sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Resorts</DropdownMenuLabel>
            {resorts.map((resort) => (
              <DropdownMenuItem key={resort.code} asChild className="gap-2 p-2">
                <Link href={`/${resort.code.toLowerCase()}`} onClick={() => isMobile && setOpenMobile(false)}>
                  <span className="flex size-6 items-center justify-center rounded-md border text-[0.6rem] font-bold">{resort.code}</span>
                  {resort.name}
                  {resort.code === current?.code && <DropdownMenuShortcut>Open</DropdownMenuShortcut>}
                </Link>
              </DropdownMenuItem>
            ))}
            {resorts.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2 p-2">
                  <Link href="/" onClick={() => isMobile && setOpenMobile(false)}>
                    <span className="flex size-6 items-center justify-center rounded-md border">
                      <Building2 className="size-3.5" />
                    </span>
                    All resorts
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Who is signed in, their role, and signing out. */
function UserMenu({ user }: { user: SidebarData["user"] }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.role}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Signed in as {user.role}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await authClient.signOut();
                router.replace("/sign-in");
                router.refresh();
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
