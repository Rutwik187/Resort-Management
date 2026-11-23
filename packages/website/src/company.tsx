import "server-only";
import { ConsentSettingsButton } from "@repo/booking-ui/consent";
import type { PropertyCode } from "@repo/sites";
import { liveCompany } from "./index";

/**
 * The company behind the resort, for the footer: legal name, GSTIN and
 * registered address (WEB-04; Razorpay checks these when it approves an
 * account). It comes from the admin's Settings and shows nothing until
 * staff enter the legal name, so no detail is ever guessed.
 */
export async function CompanyLine({ code, className }: { code: PropertyCode; className?: string }) {
  const company = await liveCompany(code);
  if (!company) return null;
  const parts = [company.legalName, company.gstin && `GSTIN ${company.gstin}`, company.address].filter(Boolean);
  return <p className={className}>{parts.join(" · ")}</p>;
}

/** The same details as a block, for the policies page. */
export async function CompanyDetails({ code, className }: { code: PropertyCode; className?: string }) {
  const company = await liveCompany(code);
  if (!company) return null;
  return (
    <dl className={className}>
      <div>
        <dt>Company</dt>
        <dd>{company.legalName}</dd>
      </div>
      {company.gstin && (
        <div>
          <dt>GSTIN</dt>
          <dd>{company.gstin}</dd>
        </div>
      )}
      {company.address && (
        <div>
          <dt>Registered address</dt>
          <dd>{company.address}</dd>
        </div>
      )}
      {company.email && (
        <div>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${company.email}`}>{company.email}</a>
          </dd>
        </div>
      )}
      {company.phone && (
        <div>
          <dt>Phone</dt>
          <dd>{company.phone}</dd>
        </div>
      )}
    </dl>
  );
}

/** The policies page's company block, with the button that reopens the cookie choice (WEB-08). */
export async function PolicyCompany({ code, className }: { code: PropertyCode; className?: string }) {
  return (
    <div className={className}>
      <CompanyDetails code={code} className="grid max-w-xl gap-x-8 gap-y-3 text-[0.95rem] sm:grid-cols-2 [&_dt]:text-[0.8rem] [&_dt]:opacity-70" />
      <ConsentSettingsButton className="mt-3 inline-flex min-h-11 items-center text-[0.95rem] underline underline-offset-4" />
    </div>
  );
}
