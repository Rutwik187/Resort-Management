"use client";

import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { addRedirect, removeRedirect, savePlaceId, setReviewFlag, syncReviewsNow } from "./seo-actions";

const toastResult = (result: { error?: string; done?: string } | undefined) => {
  if (result?.error) toast.error(result.error);
  else if (result?.done) toast.success(result.done);
};

/** The resort's Google place id, and reading its reviews now. */
export function PlaceIdForm({ propertyId, placeId }: { propertyId: string; placeId: string | null }) {
  const [state, action, pending] = useToastAction(savePlaceId.bind(null, propertyId));
  const [syncing, setSyncing] = useState(false);
  return (
    <form action={action} className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Input name="placeId" defaultValue={placeId ?? ""} placeholder="Google place id, such as ChIJN1t_tDeuEmsRUsoyG83frY4" aria-label="Google place id" className="min-w-64 flex-1 font-mono text-sm" />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Spinner />}
          Save
        </Button>
        {placeId && (
          <Button
            type="button"
            variant="outline"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              toastResult(await syncReviewsNow(propertyId));
              setSyncing(false);
            }}
          >
            {syncing ? <Spinner /> : <RefreshCw />}
            Read reviews now
          </Button>
        )}
      </div>
      <FormNote state={state} />
    </form>
  );
}

/** Feature or hide one review. */
export function ReviewButtons({ reviewId, featured, hidden }: { reviewId: string; featured: boolean; hidden: boolean }) {
  const [busy, setBusy] = useState(false);
  const run = async (flag: "featured" | "hidden", on: boolean) => {
    setBusy(true);
    toastResult(await setReviewFlag(reviewId, flag, on));
    setBusy(false);
  };
  return (
    <div className="flex gap-1">
      <Button variant={featured ? "secondary" : "ghost"} size="sm" disabled={busy} onClick={() => run("featured", !featured)}>
        <Star className={featured ? "fill-current" : undefined} />
        {featured ? "Featured" : "Feature"}
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => run("hidden", !hidden)}>
        {hidden ? <Eye /> : <EyeOff />}
        {hidden ? "Show" : "Hide"}
      </Button>
    </div>
  );
}

/** A new redirect from an old address. */
export function RedirectForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useToastAction(addRedirect.bind(null, propertyId));
  return (
    <form action={action} className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input name="from" required placeholder="Old address, such as /school-picnic" aria-label="Old address" className="font-mono text-sm" />
        <Input name="to" required placeholder="New address, such as /day-packages" aria-label="New address" className="font-mono text-sm" />
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Add redirect
        </Button>
      </div>
      <FormNote state={state} />
    </form>
  );
}

export function RemoveRedirectButton({ redirectId, from }: { redirectId: string; from: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      aria-label={`Remove the redirect from ${from}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        toastResult(await removeRedirect(redirectId));
        setBusy(false);
      }}
    >
      {busy ? <Spinner /> : <Trash2 />}
    </Button>
  );
}
