import { UserIcon } from "@sanity/icons/User";
import { defineField, defineType } from "sanity";

/** A person who writes for the blogs. One author can write for every resort. */
export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "role", title: "Role", type: "string", description: "Optional. For example: Front office, Prathamesh Resorts." }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string", initialValue: "Portrait" })],
    }),
    defineField({ name: "bio", title: "About them", type: "text", rows: 3, validation: (rule) => rule.max(300) }),
  ],
  preview: { select: { title: "name", subtitle: "role", media: "photo" } },
});
