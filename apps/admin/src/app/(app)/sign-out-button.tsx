"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@repo/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="button-quiet"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
