/**
 * The Sanity project that holds the four resorts' blogs, FAQs and policies
 * (docs/implementation-plan.md, section 11). None of these values is a
 * secret: the dataset is public, and drafts stay private.
 */
export const sanityProject = {
  projectId: "ipifz5ts",
  dataset: "production",
  /** The date of the Content Lake API the sites read. Change it only after reading Sanity's API changelog. */
  apiVersion: "2026-11-01",
} as const;

/** The Studio, hosted by Sanity, where editors write. The admin links to it. */
export const studioUrl = "https://prathamesh-resorts.sanity.studio";
