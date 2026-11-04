import Image from "next/image";
import { photos, type PhotoKey } from "@/content/photos";

type PhotoProps = {
  name: PhotoKey;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  preload?: boolean;
  /** A CSS variable index for staggered reveals. */
  style?: React.CSSProperties;
};

/** A photo that fills its frame. The frame decides the shape; the photo covers it. */
export function Photo({ name, alt, sizes, className = "", imgClassName = "", preload, style }: PhotoProps) {
  return (
    <div className={`relative overflow-hidden bg-cloud ${className}`} style={style}>
      <Image
        src={photos[name]}
        alt={alt}
        fill
        sizes={sizes}
        placeholder="blur"
        preload={preload}
        className={`object-cover ${imgClassName}`}
      />
    </div>
  );
}
