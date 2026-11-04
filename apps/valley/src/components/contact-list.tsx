import { contact } from "@/content/resort";

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
          <a className="arrow-link" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </dd>
      </div>
      <div>
        <dt className="label text-moss">Weddings</dt>
        <dd>
          <a className="arrow-link" href={`mailto:${contact.weddingEmail}`}>
            {contact.weddingEmail}
          </a>
        </dd>
      </div>
    </dl>
  );
}
