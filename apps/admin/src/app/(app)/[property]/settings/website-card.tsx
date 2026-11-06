"use client";

import { useState } from "react";
import { ExternalLink, Globe, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { refreshWebsiteNow } from "./actions";

/**
 * The resort's website and the admin: what it reads from here, and a button
 * to make it load again now. It also refreshes by itself after staff change
 * rooms, rates or packages.
 */
export function WebsiteCard({ propertyId, url }: { propertyId: string; url: string | null }) {
  const [pending, setPending] = useState(false);
  return (
    <Card className="shadow-xs">
      <CardHeader className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
          <Globe className="size-4" />
        </span>
        <div className="grid gap-1.5">
          <CardTitle>Website</CardTitle>
          <CardDescription>
            The website&apos;s Stays and Day packages pages show the rooms, rates and day packages set here. It refreshes by itself when staff change them.
          </CardDescription>
        </div>
        <CardAction>
          <Button
            variant="outline"
            disabled={pending || !url}
            onClick={async () => {
              setPending(true);
              const result = await refreshWebsiteNow(propertyId);
              setPending(false);
              if (result?.error) toast.error(result.error);
              else if (result?.done) toast.success(result.done);
            }}
          >
            {pending ? <Spinner /> : <RefreshCw />}
            Refresh the website now
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            {url.replace(/^https?:\/\//, "")}
            <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">
            Not connected yet: the admin needs this website&apos;s address in WEBSITE_URLS, and the shared REVALIDATE_SECRET. Until then the website shows its own content.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
