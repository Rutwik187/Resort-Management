import { SiteGallery } from "@repo/website/gallery";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Gallery",
  description: "Photos of Prathamesh Resorts, Khed Shivapur: rooms, the pool, weddings, food and more.",
  path: "/gallery",
});

/** The gallery staff keep in the admin, by category (URD 4.2, CMS-06). */
export default function GalleryPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1680px] px-5 pb-12 pt-28 md:px-10 md:pt-36">
        <p className="label text-fern">Gallery</p>
        <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,5.4vw,5.4rem)]">
          The resort in <em>pictures</em>
        </h1>
      </header>
      <div className="mx-auto max-w-[1680px] px-5 pb-24 md:px-10">
        <SiteGallery code="KS" empty={<>Photos are on their way.</>} />
      </div>
    </PageTransition>
  );
}
