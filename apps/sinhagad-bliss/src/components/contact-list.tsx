import { contact } from "@/content/resort";

/** Calls, WhatsApp, the wedding team and email, as a short list. */
export function ContactList({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const items = [
    { label: "Call the resort", value: contact.phone.display, href: contact.phone.href },
    { label: "WhatsApp", value: contact.whatsapp.display, href: `https://wa.me/${contact.whatsapp.number}`, external: true },
    { label: "Weddings, call or WhatsApp", value: contact.weddingPhone.display, href: contact.weddingPhone.href },
    { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
  ];
  return (
    <dl className={`grid gap-5 text-[0.98rem] sm:grid-cols-2 ${className}`} style={style}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="kicker text-slate">{item.label}</dt>
          <dd className="mt-1">
            <a
              href={item.href}
              className="link-under tap tabular-nums"
              {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {item.value}
            </a>
          </dd>
        </div>
      ))}
    </dl>
  );
}
