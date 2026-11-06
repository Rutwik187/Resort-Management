import { defineArrayMember, defineField } from "sanity";

/**
 * A link inside text. It accepts a full web address, a page on the same
 * site such as /stays, an email address (mailto:) or a phone number (tel:).
 */
export const linkAnnotation = defineArrayMember({
  name: "link",
  title: "Link",
  type: "object",
  fields: [
    defineField({
      name: "href",
      title: "Address",
      type: "url",
      description: "For example https://maps.app.goo.gl/…, /stays, mailto:info@prathameshresorts.com or tel:+919876543210.",
      validation: (rule) => rule.required().uri({ scheme: ["http", "https", "mailto", "tel"], allowRelative: true }),
    }),
  ],
});
