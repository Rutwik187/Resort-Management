import { contact } from "@/content/resort";

/** Calls, WhatsApp and email, as a short list. */
export function ContactList({ className = "", tone = "light", style }: { className?: string; tone?: "light" | "dark"; style?: React.CSSProperties }) {
  const muted = tone === "light" ? "text-stone" : "text-mist";
  return (
    <dl className={`grid gap-6 text-[0.98rem] ${className}`} style={style}>
      <div>
        <dt className={`label ${muted}`}>Bookings, by call</dt>
        <dd>
          <a className="link-line tabular-nums" href={contact.phone.href}>
            {contact.phone.display}
          </a>
        </dd>
      </div>
      <div>
        <dt className={`label ${muted}`}>WhatsApp, and weddings</dt>
        <dd>
          <a className="link-line tabular-nums" href={`https://wa.me/${contact.whatsapp.number}`} target="_blank" rel="noreferrer">
            {contact.whatsapp.display}
          </a>
        </dd>
      </div>
      <div>
        <dt className={`label ${muted}`}>Email</dt>
        <dd>
          <a className="link-line" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </dd>
      </div>
    </dl>
  );
}
