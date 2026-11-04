import { propertyFromCode, requireStaffPage } from "@/lib/staff";

/** One resort. The sidebar shows its sections; this only checks that the person works there. */
export default async function ResortLayout({ children, params }: LayoutProps<"/[property]">) {
  const staff = await requireStaffPage();
  await propertyFromCode((await params).property, staff);
  return children;
}
