import { properties } from "@repo/sites";
import { DocumentsIcon } from "@sanity/icons/Documents";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { HelpCircleIcon } from "@sanity/icons/HelpCircle";
import { HomeIcon } from "@sanity/icons/Home";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";
import type { StructureResolver } from "sanity/structure";

/**
 * The Studio's menu: one folder per resort, each with its blog posts, FAQs
 * and policies, then the authors and categories that all four share.
 */
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Content")
    .items([
      ...properties.map((p) =>
        S.listItem()
          .id(`resort-${p.code}`)
          .title(p.shortName)
          .icon(HomeIcon)
          .child(
            S.list()
              .id(`resort-${p.code}-content`)
              .title(p.name)
              .items([
                S.listItem()
                  .id(`posts-${p.code}`)
                  .title("Blog posts")
                  .icon(DocumentTextIcon)
                  .child(
                    S.documentTypeList("post")
                      .id(`posts-${p.code}-list`)
                      .title(`Blog: ${p.shortName}`)
                      .filter('_type == "post" && resort == $resort')
                      .params({ resort: p.code })
                      .defaultOrdering([{ field: "publishAt", direction: "desc" }])
                      .initialValueTemplates([S.initialValueTemplateItem("post-for-resort", { resort: p.code })]),
                  ),
                orderableDocumentListDeskItem({
                  type: "faq",
                  id: `faqs-${p.code}`,
                  title: "FAQs",
                  icon: HelpCircleIcon,
                  filter: "resort == $resort",
                  params: { resort: p.code },
                  S,
                  context,
                }),
                S.listItem()
                  .id(`policies-${p.code}`)
                  .title("Policies")
                  .icon(DocumentsIcon)
                  .child(
                    S.document()
                      .id(`policies-${p.code}-editor`)
                      .schemaType("policies")
                      .documentId(`policies-${p.code}`)
                      .initialValueTemplate("policies-for-resort", { resort: p.code }),
                  ),
              ]),
          ),
      ),
      S.divider(),
      S.documentTypeListItem("author").title("Authors"),
      S.documentTypeListItem("category").title("Categories"),
    ]);
