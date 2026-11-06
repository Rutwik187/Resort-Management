import { PortableText, type PortableTextBlock, type PortableTextComponents } from "@portabletext/react";
import { SanityPhoto, type SanityImage } from "./image";

export { SanityPhoto } from "./image";

const components: PortableTextComponents = {
  marks: {
    link: ({ value, children }) => {
      const href: string = value?.href ?? "";
      // Pages on the same site open in place; other sites open in a new tab.
      return /^https?:\/\//.test(href) ? (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      ) : (
        <a href={href}>{children}</a>
      );
    },
  },
  types: {
    postImage: ({ value }: { value: SanityImage }) => (
      <figure>
        <SanityPhoto image={value} sizes="(min-width: 768px) 46rem, 100vw" />
        {value.caption ? <figcaption>{value.caption}</figcaption> : null}
      </figure>
    ),
  },
};

/**
 * Text written in the Studio: paragraphs, headings, lists, quotes, links
 * and photos, as plain HTML. Each site styles it through the `rich-text`
 * class in its own globals.css, so it matches that site's type.
 */
export function RichText({ value, className }: { value: PortableTextBlock[]; className?: string }) {
  return (
    <div className={className ? `rich-text ${className}` : "rich-text"}>
      <PortableText value={value} components={components} />
    </div>
  );
}
