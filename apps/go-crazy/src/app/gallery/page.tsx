import { SiteGallery } from "@repo/website/gallery";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Gallery",
  description: "Photos of Prathamesh Go Crazy, Sinhagad: rooms, the pool, weddings, food and more.",
  path: "/gallery",
});

/** The gallery staff keep in the admin, by category (URD 4.2, CMS-06). */
export default function GalleryPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1600px] px-4 pb-12 pt-28 md:px-8 md:pt-36">
        <p className="up label marker marker-lime">Gallery</p>
        <h1 className="mt-6 text-[clamp(3.4rem,9vw,8rem)]">The park in pictures</h1>
      </header>
      <div className="mx-auto max-w-[1600px] px-4 pb-24 md:px-8">
        <SiteGallery code="GC" empty={<>Photos are on their way.</>} />
      </div>
    </PageTransition>
  );
}
