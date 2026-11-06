import { createImageUrlBuilder } from "@sanity/image-url";
import type { CSSProperties } from "react";
import { sanityProject } from "./config";

/** A photo from Sanity, as the queries return it. */
export type SanityImage = {
  asset: { _id: string; url: string; metadata: { lqip?: string; dimensions: { width: number; height: number } } } | null;
  hotspot?: { x: number; y: number; width: number; height: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
  caption?: string;
};

const builder = createImageUrlBuilder({ projectId: sanityProject.projectId, dataset: sanityProject.dataset });
const steps = [480, 768, 1080, 1440, 1920, 2560];

type SanityPhotoProps = {
  image: SanityImage;
  /** The width the photo takes on the page, as for `sizes` on an img. */
  sizes: string;
  /** Width over height, such as 16 / 9. Sanity crops to it around the editor's hotspot. Without it, the photo keeps its own shape. */
  aspect?: number;
  className?: string;
  /** For the first photo on a page: load it at once and first. */
  priority?: boolean;
};

/**
 * A photo from Sanity's image service, which resizes it, crops it around
 * the hotspot and sends AVIF or WebP to browsers that take them. It skips
 * Vercel's image optimisation, which has a monthly limit. The blurred
 * preview shows while the photo loads.
 */
export function SanityPhoto({ image, sizes, aspect, className, priority }: SanityPhotoProps) {
  if (!image.asset) return null;
  const { width, height } = image.asset.metadata.dimensions;
  const crop = image.crop ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const cropWidth = width * (1 - crop.left - crop.right);
  const cropHeight = height * (1 - crop.top - crop.bottom);
  const ratio = aspect ?? cropWidth / cropHeight;
  const largest = Math.round(Math.min(2560, aspect ? Math.min(cropWidth, cropHeight * aspect) : cropWidth));
  const widths = [...steps.filter((w) => w < largest), largest];
  const url = (w: number) => {
    const sized = builder.image(image).width(w).fit("crop").auto("format").quality(75);
    return (aspect ? sized.height(Math.round(w / aspect)) : sized).url();
  };
  const fallbackWidth = widths.find((w) => w >= 1080) ?? largest;
  const style: CSSProperties | undefined = image.asset.metadata.lqip
    ? { backgroundImage: `url(${image.asset.metadata.lqip})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Sanity resizes the photo, not next/image.
    <img
      src={url(fallbackWidth)}
      srcSet={widths.map((w) => `${url(w)} ${w}w`).join(", ")}
      sizes={sizes}
      width={fallbackWidth}
      height={Math.round(fallbackWidth / ratio)}
      alt={image.alt ?? ""}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      style={style}
    />
  );
}

/** A photo cropped to 1200 by 630 around its hotspot, for link previews on WhatsApp, Facebook and X. */
export function shareImage(image: SanityImage) {
  if (!image.asset) return undefined;
  const url = builder.image(image).width(1200).height(630).fit("crop").format("jpg").quality(80).url();
  return { url, width: 1200, height: 630, alt: image.alt ?? "" };
}
