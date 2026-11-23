import { eq } from "drizzle-orm";
import { getDb, messageTemplates } from "@repo/db";
import { templateKinds, type TemplateKind } from "@repo/engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateDialog } from "./template-form";

/** The resort's own wording for each email (NOT-01). */
export async function MessageTemplates({ propertyId }: { propertyId: string }) {
  const saved = await getDb().select().from(messageTemplates).where(eq(messageTemplates.propertyId, propertyId));
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>The wording of each email to guests. Write your own subject and opening, with fields such as {"{{guestName}}"}; the rest is added for you. WhatsApp and SMS templates follow once a provider is chosen.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {(Object.entries(templateKinds) as [TemplateKind, (typeof templateKinds)[TemplateKind]][]).map(([kind, info]) => {
            const own = saved.find((t) => t.kind === kind && t.channel === "email");
            return (
              <li key={kind} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {info.label}
                    {own ? (
                      <Badge variant="outline" className={own.active ? "border-primary/30 text-primary" : "text-muted-foreground"}>
                        {own.active ? "Own wording" : "Own wording, off"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        Standard
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{own ? own.subject : info.when}</p>
                </div>
                <TemplateDialog propertyId={propertyId} kind={kind} label={info.label} when={info.when} fields={info.fields} value={own ? { subject: own.subject, body: own.body, active: own.active } : undefined} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
