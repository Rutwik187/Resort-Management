import Image from "next/image";
import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { properties as sites } from "@repo/sites";
import { GroupMark } from "@/components/resort-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { resortPhoto } from "@/lib/resorts";
import { currentStaff } from "@/lib/staff";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

/** Sign-in: the form on one side, the four resorts on the other (on wide screens). */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await currentStaff()) redirect(target);

  return (
    <main className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <div className="flex items-center gap-2.5 font-semibold">
          <GroupMark />
          Prathamesh Group
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="grid w-full max-w-sm gap-7">
            <div className="grid gap-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in to the admin</h1>
              <p className="text-sm text-balance text-muted-foreground">For resort staff. Your Super Admin must add your email before you can sign in.</p>
            </div>
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>That account can&apos;t sign in</AlertTitle>
                <AlertDescription>It may not be on the staff list, or it was deactivated. Ask your Super Admin.</AlertDescription>
              </Alert>
            )}
            <SignInForm next={target} google={Boolean(process.env.GOOGLE_CLIENT_ID)} devLink={process.env.NODE_ENV !== "production"} />
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Khed Shivapur · Go Crazy · Sinhagad Bliss · Valley Resorts</p>
      </div>

      <div className="relative hidden grid-cols-2 grid-rows-2 gap-3 p-3 lg:grid">
        {sites.map((site, index) => (
          <figure key={site.code} className="relative overflow-hidden rounded-2xl bg-muted">
            <Image src={resortPhoto[site.code]} alt="" fill sizes="28vw" placeholder="blur" loading={index < 2 ? "eager" : "lazy"} className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 grid gap-0.5 p-6 text-white">
              <span className="text-lg font-semibold tracking-tight">{site.shortName}</span>
              <span className="text-sm text-white/80">{site.place}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
