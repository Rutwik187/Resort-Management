"use client";

import { useRef, useState } from "react";
import { Camera, ExternalLink, ShieldCheck, Trash2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { uploadProblem } from "@/lib/upload-problem";
import { Spinner } from "@/components/ui/spinner";
import { deleteIdProof, recordIdProof } from "./id-proof-actions";

type Proof = { id: string; label: string; contentType: string; size: number; createdAt: string; deleteAfter: string };

/**
 * Guests' ID proofs at check-in (ADM-08): a photo from the phone's camera
 * or a file, straight to the private store. Only Front Desk, the Property
 * Manager and the Super Admin see this card; each opening is logged.
 */
export function IdProofCard({ propertyId, bookingId, base, guestName, proofs, retentionDays, storageReady }: { propertyId: string; bookingId: string; base: string; guestName: string; proofs: Proof[]; retentionDays: number; storageReady: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(proofs.length ? "" : guestName);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function send(file: File) {
    if (!label.trim()) {
      toast.error("Say whose ID it is first.");
      return;
    }
    setBusy(true);
    try {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60) || "id";
      const blob = await upload(`id-proofs/${propertyId}/${bookingId}/${safe}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({ kind: "id-proof", propertyId }),
      });
      const result = await recordIdProof(bookingId, { pathname: blob.pathname, label: label.trim() });
      if (result?.error) toast.error(result.error);
      else {
        toast.success(result?.done ?? "Saved.");
        setLabel("");
      }
    } catch (error) {
      toast.error(uploadProblem(error));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          ID proofs
        </CardTitle>
        <CardDescription>Kept privately and deleted on their own after {retentionDays} days. Only Front Desk, the Property Manager and the Super Admin see them.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {proofs.length > 0 && (
          <ul className="grid gap-2">
            {proofs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.contentType === "application/pdf" ? "PDF" : "Photo"}, {Math.max(1, Math.round(p.size / 1024))} KB · deleted on {new Date(p.deleteAfter).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="size-8" asChild>
                    <a href={`${base}/id-proofs/${p.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${p.label}'s ID`}>
                      <ExternalLink />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${p.label}'s ID`}
                    disabled={removing === p.id}
                    onClick={async () => {
                      if (!window.confirm(`Delete ${p.label}'s ID proof now?`)) return;
                      setRemoving(p.id);
                      const result = await deleteIdProof(p.id);
                      setRemoving(null);
                      if (result?.error) toast.error(result.error);
                      else toast.success(result?.done ?? "Deleted.");
                    }}
                  >
                    {removing === p.id ? <Spinner /> : <Trash2 />}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {storageReady ? (
          <>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Whose ID, such as the guest's name" aria-label="Whose ID" maxLength={80} />
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
            <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? <Spinner /> : <Camera />}
              {busy ? "Uploading…" : "Add an ID proof"}
            </Button>
          </>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Uploads start once private file storage is set up on Vercel (BLOB_PRIVATE_READ_WRITE_TOKEN in the admin project).</p>
        )}
      </CardContent>
    </Card>
  );
}
