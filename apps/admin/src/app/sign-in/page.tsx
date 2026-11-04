import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/staff";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await currentStaff()) redirect(target);

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="card w-full max-w-sm p-8">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-muted">Prathamesh Group</p>
        <h1 className="mt-2 text-[1.6rem] font-semibold leading-tight">Sign in to the admin</h1>
        <p className="mt-2 text-muted">For resort staff. Your Super Admin must add your email before you can sign in.</p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-[0.9rem] text-danger">
            That account can&apos;t sign in. It may not be on the staff list, or it was deactivated. Ask your Super Admin.
          </p>
        )}
        <SignInForm next={target} google={Boolean(process.env.GOOGLE_CLIENT_ID)} devLink={process.env.NODE_ENV !== "production"} />
      </div>
    </main>
  );
}
