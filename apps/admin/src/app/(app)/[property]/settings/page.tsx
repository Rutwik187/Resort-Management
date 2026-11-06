import { can } from "@repo/auth";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { websiteUrls } from "@/lib/website";
import { SettingsForm } from "./form";
import { WebsiteCard } from "./website-card";

export const metadata = { title: "Settings" };

/** A resort's company details, check-in and check-out times, hold time and low-rooms alert. Super Admin only. */
export default async function SettingsPage({ params }: PageProps<"/[property]/settings">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "settings.manage", property.id)) return <NoAccess what="the settings" />;
  return (
    <>
      <PageHeader title="Settings" description={`${property.name}'s company details and booking settings. Taxes, payment keys, cancellation rules and message templates come with payments and messages.`} />
      <WebsiteCard propertyId={property.id} url={websiteUrls()[property.code] ?? null} />
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
    </>
  );
}
