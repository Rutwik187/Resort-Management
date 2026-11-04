import { bigserial, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { properties } from "./properties";

/**
 * Every create, change, delete, refund, price change and sign-in (USR-05):
 * who, when, from where, which record, and the values before and after.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userId: text(),
    propertyId: uuid().references(() => properties.id),
    ip: text(),
    /** Such as "room_type.create", "rate.update" or "auth.sign_in". */
    action: text().notNull(),
    /** The table, such as "room_types". */
    entity: text().notNull(),
    entityId: text(),
    before: jsonb(),
    after: jsonb(),
  },
  (t) => [index().on(t.propertyId, t.at), index().on(t.entity, t.entityId), index().on(t.userId, t.at)],
);
