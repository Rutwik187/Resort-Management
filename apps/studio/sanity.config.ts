import { sanityProject } from "@repo/sanity/config";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";
import { structure } from "./structure";

/** Templates that start a document already filed under a resort. The resort folders use them. */
const resortTemplates = [
  {
    id: "post-for-resort",
    title: "Blog post",
    schemaType: "post",
    parameters: [{ name: "resort", type: "string" }],
    value: ({ resort }: { resort: string }) => ({ resort, publishAt: new Date().toISOString() }),
  },
  {
    id: "policies-for-resort",
    title: "Policies",
    schemaType: "policies",
    parameters: [{ name: "resort", type: "string" }],
    value: ({ resort }: { resort: string }) => ({ resort }),
  },
];

export default defineConfig({
  name: "default",
  title: "Prathamesh Resorts",
  projectId: sanityProject.projectId,
  dataset: sanityProject.dataset,
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: sanityProject.apiVersion })],
  schema: {
    types: schemaTypes,
    // Each resort has exactly one policies document, opened from its folder.
    templates: (prev) => [...prev.filter((t) => t.schemaType !== "policies"), ...resortTemplates],
  },
  document: {
    // The global "Create" menu starts posts and FAQs without a resort. The resort's own folder fills it in.
    newDocumentOptions: (prev, { creationContext }) =>
      creationContext.type === "global" ? prev.filter((item) => !["post-for-resort", "policies-for-resort"].includes(item.templateId)) : prev,
    // A policies document belongs to its resort for good: it can't be copied or deleted.
    actions: (prev, { schemaType }) =>
      schemaType === "policies" ? prev.filter(({ action }) => action !== "duplicate" && action !== "delete") : prev,
  },
});
