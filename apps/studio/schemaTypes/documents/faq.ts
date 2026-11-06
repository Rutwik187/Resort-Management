import { HelpCircleIcon } from "@sanity/icons/HelpCircle";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
import { defineField, defineType } from "sanity";
import { resortField, resortName } from "../objects/resort";

/**
 * A question guests ask, and its answer. The resort's site lists its FAQs on
 * the policies page, in the order the editor drags them into. Prices and
 * dates belong in the admin, so an answer should point to the booking
 * widget instead of quoting a rate.
 */
export const faq = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  icon: HelpCircleIcon,
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: "faq", newItemPosition: "after" }),
    resortField(),
    defineField({ name: "question", title: "Question", type: "string", validation: (rule) => rule.required().max(160) }),
    defineField({
      name: "answer",
      title: "Answer",
      type: "simpleText",
      description: "Keep rates and dates out: they change in the admin, and this text would fall behind.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "question", resort: "resort" },
    prepare: ({ title, resort }) => ({ title, subtitle: resortName(resort) }),
  },
});
