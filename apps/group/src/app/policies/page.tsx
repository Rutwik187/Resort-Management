import { ConsentSettingsButton } from "@repo/booking-ui/consent";
import { resorts } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ title: "Policies", description: "The group site's privacy policy and terms, and each resort's own booking, cancellation and refund policy.", path: "/policies" });

/** The group site's privacy and terms, and a link to each company's own policies (URD 4.1, DPP-02). */
export default function PoliciesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 md:px-8">
      <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">Policies</h1>
      <section className="mt-8 grid gap-3">
        <h2 className="display text-[1.8rem]">Privacy on this site</h2>
        <p>
          This site helps you compare the four resorts. When you send an enquiry, we keep your name, phone, email and what you asked for, so the resort you chose can reply, and the consent you gave. We keep it for as long as we
          need it to answer you and for our records, and we never sell it.
        </p>
        <p>
          With your consent we use cookies to count visits and to measure our ads. You can change that at any time. To see, correct or delete the details we hold, write to the resort you contacted; its contacts are on its own
          site.
        </p>
        <ConsentSettingsButton className="justify-self-start text-forest underline underline-offset-4" />
      </section>
      <section className="mt-10 grid gap-3">
        <h2 className="display text-[1.8rem]">Terms</h2>
        <p>Bookings are made, paid and invoiced on each resort&apos;s own site, by that resort&apos;s company, under its own booking, cancellation and refund policy. Prices shown here are a guide; the resort&apos;s site has the final price with GST.</p>
      </section>
      <section className="mt-10">
        <h2 className="display text-[1.8rem]">Each resort&apos;s policies</h2>
        <ul className="mt-4 grid gap-2">
          {resorts.map((r) => (
            <li key={r.code}>
              <a href={`${r.url}/policies`} className="text-forest underline underline-offset-4">
                {r.name}: booking, cancellation, refund and privacy
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
