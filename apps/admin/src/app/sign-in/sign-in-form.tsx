"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { authClient } from "@repo/auth/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/** Google's "G", drawn in its own colours, as Google asks for its sign-in buttons. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
    </svg>
  );
}

/** Google for everyone; an emailed link too on a developer's machine. */
export function SignInForm({ next, google, devLink }: { next: string; google: boolean; devLink: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "link" | null>(null);

  async function withGoogle() {
    setBusy("google");
    setMessage(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/sign-in?error=refused" });
    if (error) {
      setMessage(error.message ?? "Google sign-in didn't work. Try again.");
      setBusy(null);
    }
  }

  async function withLink(form: FormData) {
    setBusy("link");
    setMessage(null);
    const { error } = await authClient.signIn.magicLink({ email: String(form.get("email")), callbackURL: next, errorCallbackURL: "/sign-in?error=refused" });
    setMessage(error ? (error.message ?? "That didn't work.") : "If this email is on the staff list, its sign-in link is now in the terminal running the admin.");
    setBusy(null);
  }

  return (
    <div className="grid gap-5">
      {google ? (
        <Button type="button" variant="outline" size="lg" onClick={withGoogle} disabled={busy !== null} className="w-full">
          {busy === "google" ? <Spinner /> : <GoogleMark />}
          Sign in with Google
        </Button>
      ) : (
        <Alert>
          <AlertDescription>Google sign-in is not set up yet: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.</AlertDescription>
        </Alert>
      )}
      {devLink && (
        <form action={withLink} className="grid gap-3 border-t pt-5">
          <Field>
            <FieldLabel htmlFor="email">Email a sign-in link</FieldLabel>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            <FieldDescription>Development only. The link appears in the terminal running the admin.</FieldDescription>
          </Field>
          <Button type="submit" variant="secondary" disabled={busy !== null}>
            {busy === "link" ? <Spinner /> : <Mail />}
            Send link
          </Button>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
