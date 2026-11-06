/**
 * Copies each site's policies text from its code into Sanity, so editors
 * start from the words the sites show today. It only creates a resort's
 * policies document when there is none, so it never overwrites an editor's
 * changes. Go Crazy's meal times stay in its code: times belong in the admin.
 *
 *   pnpm --filter studio exec sanity exec scripts/import-policies.ts --with-user-token
 */
import { randomUUID } from "node:crypto";
import { getCliClient } from "sanity/cli";
import * as gc from "../../go-crazy/src/content/resort";
import * as ks from "../../khed-shivapur/src/content/policies";
import { policies as sbPolicies } from "../../sinhagad-bliss/src/content/policies";
import * as pv from "../../valley/src/content/policies";

type Span = string | { text: string; href: string };
const key = () => randomUUID().slice(0, 12);

function block(content: Span | Span[], options: { style?: "normal" | "h3"; list?: "bullet" | "number" } = {}) {
  const markDefs: { _key: string; _type: "link"; href: string }[] = [];
  const children = [content].flat().map((span) => {
    if (typeof span === "string") return { _type: "span", _key: key(), text: span, marks: [] };
    const mark = { _key: key(), _type: "link" as const, href: span.href };
    markDefs.push(mark);
    return { _type: "span", _key: key(), text: span.text, marks: [mark._key] };
  });
  return {
    _type: "block",
    _key: key(),
    style: options.style ?? "normal",
    markDefs,
    children,
    ...(options.list ? { listItem: options.list, level: 1 } : {}),
  };
}

const list = (items: readonly string[], kind: "bullet" | "number") => items.map((item) => block(item, { list: kind }));
const titled = (blocks: { title: string; body: string[] }[]) => blocks.flatMap((b) => [block(b.title, { style: "h3" }), ...b.body.map((p) => block(p))]);
const section = (anchor: string, title: string, body: ReturnType<typeof block>[]) => ({ _type: "policySection", _key: key(), anchor, title, body });

const documents = [
  {
    resort: "KS",
    sections: [
      section("cancellation", "Cancellation", list(ks.cancellation, "bullet")),
      section("terms", "Terms of use", list(ks.terms, "number")),
      section("privacy", "Privacy policy", titled(ks.privacy)),
    ],
  },
  {
    resort: "GC",
    sections: [
      section("rules", "Park rules", list(gc.houseRules, "number")),
      section("safety", "Safety on the rides", list(gc.safetyRules, "number")),
      section("pools", "In the pools", list(gc.poolRules, "number")),
      section("terms", "Tickets, entry and cancellation", list(gc.entryTerms, "number")),
      section("payment", "Payments", list(gc.paymentTerms, "number")),
      section("privacy", "Your details", [
        block(
          "This website has no accounts and does not store what you type into its forms. The enquiry form opens WhatsApp on your own phone or computer with your message filled in. Nothing is sent until you press send in WhatsApp, and from then on WhatsApp's own privacy policy applies.",
        ),
        block([
          "The site sets no cookies of its own and runs no tracking or advertising scripts. For any question about your details, write to ",
          { text: gc.contact.email, href: `mailto:${gc.contact.email}` },
          ".",
        ]),
      ]),
    ],
  },
  {
    resort: "SB",
    sections: sbPolicies.map((policy) =>
      section(policy.id, policy.title, [
        ...(policy.updated ? [block(`${policy.updated}.`)] : []),
        ...policy.blocks.flatMap((b) => [
          ...(b.heading ? [block(b.heading, { style: "h3" })] : []),
          ...(b.paragraphs ?? []).map((p) => block(p)),
          ...list(b.list ?? [], "bullet"),
        ]),
      ]),
    ),
  },
  {
    resort: "PV",
    sections: [
      section("terms", "Terms and conditions", list(pv.terms, "number")),
      section("cancellation", "Cancellation", list(pv.cancellation, "bullet")),
      section("privacy", "Privacy policy", titled(pv.privacy)),
    ],
  },
];

const client = getCliClient({ apiVersion: "2026-11-01" });
for (const doc of documents) {
  const result = await client.createIfNotExists({ _id: `policies-${doc.resort}`, _type: "policies", ...doc });
  console.log(`policies-${doc.resort}: ${result._rev ? "ready" : "?"} (${doc.sections.length} sections)`);
}
