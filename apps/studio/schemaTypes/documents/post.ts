import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineField, defineType, type SlugValidationContext } from "sanity";
import { sanityProject } from "@repo/sanity/config";
import { resortField, resortName } from "../objects/resort";

/** Two posts may share an address only on different resorts' sites. */
async function slugIsFreeOnItsSite(slug: string, context: SlugValidationContext) {
  const { document, getClient } = context;
  if (!document) return true;
  const id = document._id.replace(/^drafts\./, "");
  const taken = await getClient({ apiVersion: sanityProject.apiVersion }).fetch<boolean>(
    `count(*[_type == "post" && slug.current == $slug && resort == $resort && !(_id in [$id, "drafts." + $id])]) > 0`,
    { slug, resort: document.resort ?? null, id },
  );
  return !taken;
}

export const post = defineType({
  name: "post",
  title: "Blog post",
  type: "document",
  icon: DocumentTextIcon,
  groups: [
    { name: "post", title: "Post", default: true },
    { name: "search", title: "Search" },
  ],
  fields: [
    defineField({ name: "title", title: "Title", type: "string", group: "post", validation: (rule) => rule.required().max(100) }),
    defineField({
      name: "slug",
      title: "Address",
      type: "slug",
      group: "post",
      description: "The end of the post's web address: /blog/<this>. Press Generate to make it from the title. Don't change it after the post is live, or old links break.",
      options: { source: "title", maxLength: 80, isUnique: slugIsFreeOnItsSite },
      validation: (rule) => rule.required(),
    }),
    { ...resortField(), group: "post" },
    defineField({
      name: "publishAt",
      title: "Show from",
      type: "datetime",
      group: "post",
      description: "The site shows the post from this time. Pick a later time to schedule it. A published post reaches the site within 15 minutes.",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Summary",
      type: "text",
      rows: 3,
      group: "post",
      description: "One or two sentences. The blog list shows them, and so do search results unless you fill in the Search tab.",
      validation: (rule) => rule.required().max(220),
    }),
    defineField({
      name: "coverImage",
      title: "Cover photo",
      type: "image",
      group: "post",
      description: "A wide photo, at least 1600 pixels across. Drag the circle onto the part that must never be cropped.",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "What the photo shows, for guests who can't see it.",
          validation: (rule) => rule.required().max(160),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "author", title: "Written by", type: "reference", group: "post", to: [{ type: "author" }] }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      group: "post",
      of: [{ type: "reference", to: [{ type: "category" }] }],
      validation: (rule) => rule.unique(),
    }),
    defineField({ name: "body", title: "Post", type: "postBody", group: "post", validation: (rule) => rule.required() }),
    defineField({
      name: "searchTitle",
      title: "Title in search results",
      type: "string",
      group: "search",
      description: "Optional. Up to about 60 characters. The post's title is used when this is empty.",
      validation: (rule) => rule.max(70).warning("Google cuts titles longer than about 60 characters."),
    }),
    defineField({
      name: "searchDescription",
      title: "Description in search results",
      type: "text",
      rows: 3,
      group: "search",
      description: "Optional. Up to about 155 characters. The summary is used when this is empty.",
      validation: (rule) => rule.max(170).warning("Google cuts descriptions longer than about 155 characters."),
    }),
  ],
  orderings: [{ title: "Newest first", name: "publishAtDesc", by: [{ field: "publishAt", direction: "desc" }] }],
  preview: {
    select: { title: "title", resort: "resort", publishAt: "publishAt", media: "coverImage" },
    prepare: ({ title, resort, publishAt, media }) => ({
      title,
      media,
      subtitle: [resortName(resort), publishAt ? new Date(publishAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "No date"].join(" · "),
    }),
  },
});
