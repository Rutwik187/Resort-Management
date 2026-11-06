-- The Website page (notices, and refreshing the site) gets its own permission.
-- The Super Admin and Property Manager roles have it, as in packages/db/src/access.ts.
-- The role's description is changed only where nobody has edited it.
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'website.manage' FROM "roles" WHERE "key" IN ('super_admin', 'property_manager')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "roles" SET "description" = 'Rooms, inventory, prices, packages, offers, bookings and the website for their resort.'
WHERE "key" = 'property_manager' AND "description" = 'Rooms, inventory, prices, packages, offers and bookings for their resort.';
