import { SiteGallery } from "@repo/website/gallery";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";
import { SectionLabel } from "@/components/section-label";

export const metadata = pageMetadata({
  title: "Gallery",
  description: "Photos of Prathamesh Valley Resorts, Mahabaleshwar: rooms, the pool, weddings, food and more.",
  path: "/gallery",
});

/** The gallery staff keep in the admin, by category (URD 4.2, CMS-06). */
export default function GalleryPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1600px] px-5 pb-12 pt-32 md:px-10 md:pt-44">
        <SectionLabel className="text-moss">Gallery</SectionLabel>
        <h1 className="mt-8 max-w-4xl text-[clamp(3rem,7vw,7rem)]">
          The valley in <em>pictures</em>
        </h1>
      </header>
      <div className="mx-auto max-w-[1600px] px-5 pb-24 md:px-10">
        <SiteGallery code="PV" empty={<>Photos are on their way.</>} />
      </div>
    </PageTransition>
  );
}
