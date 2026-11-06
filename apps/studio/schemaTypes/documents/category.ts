import { TagIcon } from "@sanity/icons/Tag";
import { defineField, defineType } from "sanity";

/** A topic for blog posts, such as Weddings or Monsoon trips. Every resort shares the list. */
export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({ name: "title", title: "Name", type: "string", validation: (rule) => rule.required().max(40) }),
    defineField({ name: "description", title: "Description", type: "text", rows: 2 }),
  ],
});
