import { DocumentsIcon } from "@sanity/icons/Documents";
import { defineArrayMember, defineField, defineType } from "sanity";
import { resortField, resortName } from "../objects/resort";

/**
 * A resort's policies page: cancellation, terms, privacy and house rules.
 * There is one per resort. While a resort has none here, or it has no
 * sections, its site shows the text in its own code.
 */
export const policies = defineType({
  name: "policies",
  title: "Policies",
  type: "document",
  icon: DocumentsIcon,
  fields: [
    resortField({ readOnly: true }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      description: "In the order the page shows them. Drag to reorder.",
      of: [
        defineArrayMember({
          name: "policySection",
          title: "Section",
          type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required() }),
            defineField({
              name: "anchor",
              title: "Link name",
              type: "string",
              description: "The section's own address: terms gives /policies#terms. Lower-case letters, digits and hyphens. Keep the existing ones, because old links use them.",
              validation: (rule) =>
                rule
                  .required()
                  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { name: "link name" })
                  .custom((anchor, context) => {
                    const sections = (context.document?.sections ?? []) as { anchor?: string }[];
                    return sections.filter((s) => s.anchor === anchor).length > 1 ? "Two sections can't share a link name." : true;
                  }),
            }),
            defineField({ name: "body", title: "Text", type: "simpleText", validation: (rule) => rule.required() }),
          ],
          preview: { select: { title: "title", anchor: "anchor" }, prepare: ({ title, anchor }) => ({ title, subtitle: `#${anchor}` }) },
        }),
      ],
    }),
  ],
  preview: {
    select: { resort: "resort" },
    prepare: ({ resort }) => ({ title: `Policies: ${resortName(resort)}` }),
  },
});
