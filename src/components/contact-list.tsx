import { contact } from "@/content/resort";

/** Reservations, the wedding team and email, as a short list. */
export function ContactList({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <dl className={`grid gap-6 text-[0.95rem] ${className}`} style={style}>
      <div>
        <dt className="label text-fern">Reservations</dt>
        <dd>
          <a className="link-line tabular-nums" href={contact.bookingPhone.href}>
            {contact.bookingPhone.display}
          </a>
        </dd>
      </div>
      <div>
        <dt className="label text-fern">Weddings, by call or WhatsApp</dt>
        <dd>
          <a className="link-line tabular-nums" href={contact.weddingPhone.href}>
            {contact.weddingPhone.display}
          </a>
        </dd>
      </div>
      <div>
        <dt className="label text-fern">Email</dt>
        <dd>
          <a className="link-line" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </dd>
      </div>
    </dl>
  );
}
