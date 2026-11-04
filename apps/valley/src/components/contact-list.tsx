import { contact } from "@/content/resort";
import { Email } from "./email";

/** Calls and WhatsApp, the wedding desk and email, as a short list. */
export function ContactList({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <dl className={`grid gap-6 text-[0.95rem] ${className}`} style={style}>
      <div>
        <dt className="label text-moss">Bookings, call or WhatsApp</dt>
        <dd>
          <a className="arrow-link tabular-nums" href={contact.phone.href}>
            {contact.phone.display}
          </a>
        </dd>
      </div>
      <div>
        <dt className="label text-moss">Email</dt>
        <dd>
          <a className="arrow-link min-w-0 [overflow-wrap:anywhere]" href={`mailto:${contact.email}`}>
            <span className="min-w-0">
              <Email address={contact.email} />
            </span>
          </a>
        </dd>
      </div>
      <div>
        <dt className="label text-moss">Weddings</dt>
        <dd>
          <a className="arrow-link min-w-0 [overflow-wrap:anywhere]" href={`mailto:${contact.weddingEmail}`}>
            <span className="min-w-0">
              <Email address={contact.weddingEmail} />
            </span>
          </a>
        </dd>
      </div>
    </dl>
  );
}
