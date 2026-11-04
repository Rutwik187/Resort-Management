/*
 * The permission names and the five roles from the URD's permission matrix
 * (section 3.2). Roles are rows in the database (USR-04); these are the
 * ones the seed creates. A permission always applies inside the resorts a
 * person is assigned to.
 */

export const permissions = {
  "dashboard.view": "See the dashboard",
  "bookings.view": "See bookings",
  "bookings.create": "Create offline bookings",
  "bookings.modify": "Change dates, rooms and guests",
  "bookings.cancel": "Cancel bookings",
  "refunds.request": "Ask for a refund",
  "refunds.initiate": "Start a refund",
  "refunds.approve": "Approve refunds",
  "rooms.manage": "Manage rooms, cottages and units",
  "inventory.view": "See the inventory calendar",
  "inventory.block": "Block rooms and dates",
  "inventory.manage": "Set stay rules and day capacity",
  "prices.view": "See prices, packages, offers and coupons",
  "prices.manage": "Change prices, packages, offers and coupons",
  "leads.view": "See leads",
  "leads.manage": "Work leads",
  "reports.daily": "See the daily report",
  "reports.leads": "See lead reports",
  "reports.view": "See all reports",
  "users.manage": "Manage users and roles",
  "settings.manage": "Change settings, taxes, payment keys and policies",
  "audit.view": "See the audit log",
} as const;

export type Permission = keyof typeof permissions;

export const allPermissions = Object.keys(permissions) as Permission[];

type RoleDefinition = { key: string; name: string; description: string; permissions: Permission[] };

export const builtInRoles: RoleDefinition[] = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Management. Everything, across every resort. Adds and removes users, approves refunds.",
    permissions: allPermissions,
  },
  {
    key: "property_manager",
    name: "Property Manager",
    description: "Rooms, inventory, prices, packages, offers and bookings for their resort.",
    permissions: [
      "dashboard.view",
      "bookings.view",
      "bookings.create",
      "bookings.modify",
      "bookings.cancel",
      "refunds.request",
      "rooms.manage",
      "inventory.view",
      "inventory.block",
      "inventory.manage",
      "prices.view",
      "prices.manage",
      "leads.view",
      "leads.manage",
      "reports.view",
    ],
  },
  {
    key: "front_desk",
    name: "Front Desk",
    description: "Offline bookings, check-in and check-out, blocking rooms, seeing bookings.",
    permissions: ["dashboard.view", "bookings.view", "bookings.create", "bookings.modify", "inventory.view", "inventory.block", "leads.view", "reports.daily"],
  },
  {
    key: "sales",
    name: "Sales",
    description: "Leads, corporate and wedding enquiries, follow-ups and quotes. Sees bookings read-only.",
    permissions: ["dashboard.view", "bookings.view", "inventory.view", "leads.view", "leads.manage", "reports.leads"],
  },
  {
    key: "accounts",
    name: "Accounts",
    description: "Payments, refunds, invoices, sales reports and exports.",
    permissions: ["dashboard.view", "bookings.view", "refunds.initiate", "inventory.view", "prices.view", "reports.view", "audit.view"],
  },
];
