"use client";

import { useState } from "react";
import { authClient } from "@repo/auth/client";

/** Google for everyone; an emailed link too on a developer's machine. */
export function SignInForm({ next, google, devLink }: { next: string; google: boolean; devLink: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function withGoogle() {
    setBusy(true);
    setMessage(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/sign-in?error=refused" });
    if (error) {
      setMessage(error.message ?? "Google sign-in didn't work. Try again.");
      setBusy(false);
    }
  }

  async function withLink(form: FormData) {
    setBusy(true);
    setMessage(null);
    const { error } = await authClient.signIn.magicLink({ email: String(form.get("email")), callbackURL: next, errorCallbackURL: "/sign-in?error=refused" });
    setMessage(error ? (error.message ?? "That didn't work.") : "If this email is on the staff list, its sign-in link is now in the terminal running the admin.");
    setBusy(false);
  }

  return (
    <div className="mt-6 grid gap-4">
      {google ? (
        <button type="button" onClick={withGoogle} disabled={busy} className="button w-full">
          Sign in with Google
        </button>
      ) : (
        <p className="rounded-lg bg-page p-3 text-[0.88rem] text-muted">Google sign-in is not set up yet: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.</p>
      )}
      {devLink && (
        <form action={withLink} className="grid gap-2 border-t border-line pt-4">
          <label className="label" htmlFor="email">
            Development only: email a sign-in link
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          <button type="submit" disabled={busy} className="button-quiet justify-center">
            Send link
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="text-[0.88rem] text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
