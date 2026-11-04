import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentStaff } from "@/lib/staff";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await currentStaff()) redirect(target);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
      <div className="flex items-center gap-2 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">PG</span>
        Prathamesh Group
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to the admin</CardTitle>
          <CardDescription>For resort staff. Your Super Admin must add your email before you can sign in.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>That account can&apos;t sign in</AlertTitle>
              <AlertDescription>It may not be on the staff list, or it was deactivated. Ask your Super Admin.</AlertDescription>
            </Alert>
          )}
          <SignInForm next={target} google={Boolean(process.env.GOOGLE_CLIENT_ID)} devLink={process.env.NODE_ENV !== "production"} />
        </CardContent>
      </Card>
      <p className="max-w-sm text-center text-xs text-muted-foreground">Khed Shivapur · Go Crazy · Sinhagad Bliss · Valley Resorts</p>
    </main>
  );
}
