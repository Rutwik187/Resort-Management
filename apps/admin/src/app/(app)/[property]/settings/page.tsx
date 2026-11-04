import { can } from "@repo/auth";
import { NoAccess } from "@/components/no-access";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { SettingsForm } from "./form";

export const metadata = { title: "Settings" };

/** A resort's company details, check-in and check-out times, hold time and low-rooms alert. Super Admin only. */
export default async function SettingsPage({ params }: PageProps<"/[property]/settings">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "settings.manage", property.id)) return <NoAccess what="the settings" />;
  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">Settings</h1>
      <p className="mt-1 text-muted-foreground">Taxes, payment keys, cancellation rules and message templates come with payments and messages.</p>
      <SettingsForm
        propertyId={property.id}
        settings={{
          legalName: property.legalName,
          gstin: property.gstin,
          address: property.address,
          email: property.email,
          phone: property.phone,
          checkInTime: property.checkInTime,
          checkOutTime: property.checkOutTime,
          holdMinutes: property.holdMinutes,
          lowStockThreshold: property.lowStockThreshold,
        }}
      />
    </div>
  );
}
