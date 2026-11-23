import { SiteGallery } from "@repo/website/gallery";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Gallery",
  description: "Photos of Sinhagad Bliss: rooms, the pool, weddings, food and more.",
  path: "/gallery",
});

/** The gallery staff keep in the admin, by category (URD 4.2, CMS-06). */
export default function GalleryPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1560px] px-5 pb-12 pt-36 md:px-10 md:pt-48">
        <p className="kicker text-slate">Gallery</p>
        <h1 className="mt-8 text-[clamp(3.2rem,8vw,8rem)] leading-[0.98]">
          <em>Gallery</em>
        </h1>
      </header>
      <div className="mx-auto max-w-[1560px] px-5 pb-24 md:px-10">
        <SiteGallery code="SB" empty={<>Photos are on their way.</>} />
      </div>
    </PageTransition>
  );
}
