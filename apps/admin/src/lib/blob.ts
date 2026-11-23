import "server-only";

/*
 * File storage on Vercel Blob (plan section 1: Files). Two stores:
 *   public   photos for the websites: gallery and page photos
 *            (BLOB_READ_WRITE_TOKEN, the default name Vercel gives a store)
 *   private  guests' ID proofs, never reachable without the admin
 *            (BLOB_PRIVATE_READ_WRITE_TOKEN)
 * Files go from the browser straight to Blob with a short-lived token, so
 * large photos skip Vercel's 4.5 MB limit on uploads through a function.
 */

export const publicToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
export const privateToken = () => process.env.BLOB_PRIVATE_READ_WRITE_TOKEN?.trim() || undefined;

/** What each kind of upload may be, and where it goes. */
export const uploadKinds = {
  "id-proof": { access: "private" as const, types: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"], maxBytes: 10 * 1024 * 1024, prefix: "id-proofs/" },
  photo: { access: "public" as const, types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 20 * 1024 * 1024, prefix: "photos/" },
};
export type UploadKind = keyof typeof uploadKinds;
