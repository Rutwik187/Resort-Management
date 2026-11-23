-- Exporting leads (CRM-10) and guests who agreed to marketing (ADM-10) get their own permissions.
-- Leads: Super Admin and Sales. Guests: Super Admin only. As in packages/db/src/access.ts.
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'leads.export' FROM "roles" WHERE "key" IN ('super_admin', 'sales')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'guests.export' FROM "roles" WHERE "key" = 'super_admin'
ON CONFLICT DO NOTHING;
