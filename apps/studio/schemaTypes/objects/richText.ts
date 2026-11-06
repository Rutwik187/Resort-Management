import { defineArrayMember, defineField, defineType } from "sanity";
import { linkAnnotation } from "./link";

const marks = {
  decorators: [
    { title: "Bold", value: "strong" },
    { title: "Italic", value: "em" },
  ],
  annotations: [linkAnnotation],
};

/**
 * Text for an FAQ answer or a policy section: paragraphs, small headings,
 * lists and links. No photos, so the text stays short and plain.
 */
export const simpleText = defineType({
  name: "simpleText",
  title: "Text",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraph", value: "normal" },
        { title: "Small heading", value: "h3" },
      ],
      lists: [
        { title: "Bullets", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks,
    }),
  ],
});

/** A photo inside a blog post, with the alt text a screen reader reads and an optional caption. */
export const postImage = defineArrayMember({
  name: "postImage",
  title: "Photo",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description: "What the photo shows, for guests who can't see it. For example: The glass house at dusk, its lights on, beside the river.",
      validation: (rule) => rule.required().max(160),
    }),
    defineField({ name: "caption", title: "Caption", type: "string", description: "Optional. Shown under the photo." }),
  ],
});

/** The body of a blog post: headings, lists, quotes, links and photos. */
export const postBody = defineType({
  name: "postBody",
  title: "Body",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraph", value: "normal" },
        { title: "Heading", value: "h2" },
        { title: "Small heading", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullets", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks,
    }),
    postImage,
  ],
});
