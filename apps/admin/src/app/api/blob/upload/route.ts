import { headers } from "next/headers";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { can, getStaff } from "@repo/auth";
import { privateToken, publicToken, uploadKinds } from "@/lib/blob";

/**
 * Gives the browser a short-lived token to upload one file straight to
 * Vercel Blob. ID proofs need the ID proof permission and go to the private
 * store under id-proofs/<resort>/; photos need the website permission and go
 * to the public store under photos/<resort>/. The file is recorded by the
 * server action the page calls once the upload finishes.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const staff = await getStaff(await headers());
  if (!staff) return Response.json({ error: "Sign in first." }, { status: 401 });
  const kind = body.type === "blob.generate-client-token" ? (JSON.parse(body.payload.clientPayload ?? "{}") as { kind?: string }).kind : undefined;
  const token = kind === "id-proof" ? privateToken() : publicToken();
  if (body.type === "blob.generate-client-token" && !token) {
    return Response.json({ error: kind === "id-proof" ? "Private file storage isn't set up yet (BLOB_PRIVATE_READ_WRITE_TOKEN)." : "Photo storage isn't set up yet (BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }
  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = z.object({ kind: z.enum(["id-proof", "photo"]), propertyId: z.uuid() }).parse(JSON.parse(clientPayload ?? "{}"));
        const rule = uploadKinds[payload.kind];
        const allowed = payload.kind === "id-proof" ? can(staff, "id_proofs.manage", payload.propertyId) : can(staff, "website.manage", payload.propertyId);
        if (!allowed) throw new Error("Your role can't upload this here.");
        if (!pathname.startsWith(`${rule.prefix}${payload.propertyId}/`) || pathname.includes("..")) throw new Error("That file name isn't allowed.");
        return { allowedContentTypes: rule.types, maximumSizeInBytes: rule.maxBytes, addRandomSuffix: true };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The upload couldn't start." }, { status: 400 });
  }
}
