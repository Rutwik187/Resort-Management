import { boolean, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { timestamps } from "./common";
import { properties } from "./properties";

/**
 * Roles are data, not code (USR-04): a new role is a new row with its own
 * set of permissions. The five from the URD are seeded (scripts/seed.ts).
 */
export const roles = pgTable("roles", {
  id: uuid().primaryKey().defaultRandom(),
  /** Stable, such as "front_desk". */
  key: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  /** Roles the seed creates. They can be edited but not deleted. */
  builtIn: boolean().notNull().default(false),
  ...timestamps,
});

/** The permissions in a role, by name, such as "bookings.cancel" (see packages/auth). */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })],
);

/**
 * A person allowed into the admin, with one role (USR-01). Only people in
 * this table can sign in: the Super Admin adds them by email first.
 */
export const staffMembers = pgTable("staff_members", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  roleId: uuid()
    .notNull()
    .references(() => roles.id),
  /** Every resort, now and later. Otherwise only the resorts in staff_properties. */
  allProperties: boolean().notNull().default(false),
  /** A deactivated person can't sign in, and their sessions end within 5 minutes (USR-03). */
  active: boolean().notNull().default(true),
  invitedBy: text(),
  deactivatedAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

/** The resorts a staff member works for. */
export const staffProperties = pgTable(
  "staff_properties",
  {
    userId: text()
      .notNull()
      .references(() => staffMembers.userId, { onDelete: "cascade" }),
    propertyId: uuid()
      .notNull()
      .references(() => properties.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.propertyId] })],
);
