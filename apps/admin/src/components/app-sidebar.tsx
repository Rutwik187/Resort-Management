"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronsUpDown,
  ClipboardList,
  ExternalLink,
  IndianRupee,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Plus,
  ScrollText,
  Settings,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@repo/auth/client";
import { GroupMark, ResortMark } from "@/components/resort-mark";
import { PersonAvatar } from "@/components/person-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
export type Section = { key: "today" | "bookings" | "leads" | "calendar" | "rooms" | "prices" | "packages" | "settings"; label: string };
export type SidebarResort = { code: string; name: string; shortName: string; place: string; website: string; sections: Section[]; canBook: boolean };
export type SidebarData = {
  resorts: SidebarResort[];
  group: { key: "staff" | "audit"; label: string }[];
  user: { name: string; email: string; role: string; image: string | null };
};

const sectionIcon: Record<Section["key"], LucideIcon> = {
  today: LayoutDashboard,
  bookings: ClipboardList,
  leads: Inbox,
  calendar: CalendarDays,
  rooms: BedDouble,
  prices: IndianRupee,
  packages: Ticket,
  settings: Settings,
};
const groupIcon = { staff: Users, audit: ScrollText } as const;

/** The day's work first, then what is set up once and changed now and then. */
const sectionGroups: { label: string; keys: Section["key"][] }[] = [
  { label: "Front office", keys: ["today", "bookings", "leads", "calendar"] },
  { label: "Resort setup", keys: ["rooms", "prices", "packages", "settings"] },
];

/** The current page stands out: white, raised, with a green icon. */
const activeLook =
  "data-[active=true]:bg-background data-[active=true]:font-medium data-[active=true]:text-foreground data-[active=true]:shadow-xs data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border data-[active=true]:[&>svg]:text-primary";

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
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="New booking"
                    className="bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
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
          sectionGroups.map((group) => {
            const items = current.sections.filter((item) => group.keys.includes(item.key));
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => {
                      const Icon = sectionIcon[item.key];
                      const href = `/${current.code.toLowerCase()}${item.key === "today" ? "" : `/${item.key}`}`;
                      return (
                        <SidebarMenuItem key={item.key}>
                          <SidebarMenuButton asChild isActive={section === item.key} tooltip={item.label} className={activeLook}>
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
            );
          })
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Resorts</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.resorts.map((resort) => (
                  <SidebarMenuItem key={resort.code}>
                    <SidebarMenuButton asChild tooltip={resort.name} className="h-10">
                      <Link href={`/${resort.code.toLowerCase()}`} onClick={close}>
                        <ResortMark code={resort.code} className="size-6 rounded-md" />
                        <span className="grid leading-tight">
                          <span className="truncate">{resort.shortName}</span>
                          <span className="truncate text-xs text-muted-foreground">{resort.place}</span>
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(data.group.length > 0 || (current && data.resorts.length > 1)) && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Prathamesh Group</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {current && data.resorts.length > 1 && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="All resorts" className={activeLook}>
                      <Link href="/" onClick={close}>
                        <LayoutGrid />
                        <span>All resorts</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {data.group.map((item) => {
                  const Icon = groupIcon[item.key];
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild isActive={segments[0] === item.key} tooltip={item.label} className={activeLook}>
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
  const close = () => isMobile && setOpenMobile(false);
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              {current ? <ResortMark code={current.code} className="shadow-sm" /> : <GroupMark />}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{current?.shortName ?? "Prathamesh Group"}</span>
                <span className="truncate text-xs text-muted-foreground">{current?.place ?? `${resorts.length} resorts`}</span>
              </div>
              <ChevronsUpDown className="ml-auto text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg" align="start" side={isMobile ? "bottom" : "right"} sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Switch resort</DropdownMenuLabel>
            {resorts.map((resort) => (
              <DropdownMenuItem key={resort.code} asChild className="gap-2.5 p-2">
                <Link href={`/${resort.code.toLowerCase()}`} onClick={close}>
                  <ResortMark code={resort.code} className="size-8 rounded-md" />
                  <span className="grid flex-1 leading-tight">
                    <span className="truncate font-medium">{resort.shortName}</span>
                    <span className="truncate text-xs text-muted-foreground">{resort.name}</span>
                  </span>
                  {resort.code === current?.code && <Check className="text-primary" />}
                </Link>
              </DropdownMenuItem>
            ))}
            {(resorts.length > 1 || current) && <DropdownMenuSeparator />}
            {resorts.length > 1 && (
              <DropdownMenuItem asChild className="gap-2.5 p-2">
                <Link href="/" onClick={close}>
                  <span className="flex size-8 items-center justify-center rounded-md border bg-background">
                    <LayoutGrid className="size-4" />
                  </span>
                  All resorts
                </Link>
              </DropdownMenuItem>
            )}
            {current && (
              <DropdownMenuItem asChild className="gap-2.5 p-2">
                <a href={current.website} target="_blank" rel="noreferrer">
                  <span className="flex size-8 items-center justify-center rounded-md border bg-background">
                    <ExternalLink className="size-4" />
                  </span>
                  Open the website
                </a>
              </DropdownMenuItem>
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
              <PersonAvatar name={user.name} image={user.image} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.role}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-1 py-1.5 text-left text-sm">
                <PersonAvatar name={user.name} image={user.image} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Signed in as {user.role}</DropdownMenuLabel>
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
