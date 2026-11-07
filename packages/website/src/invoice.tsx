import type { InvoiceLineJson, InvoicePartyJson } from "@repo/db";

/*
 * A GST invoice or credit note as a printable page (PR-07). The admin and
 * the guest's booking page both show it; its styles are its own, so it
 * looks the same inside any site's design. Printing saves it as a PDF.
 */

export type InvoiceView = {
  kind: "invoice" | "credit_note";
  number: string;
  issuedOn: string;
  bookingNumber: string;
  seller: InvoicePartyJson;
  buyer: InvoicePartyJson;
  lines: InvoiceLineJson[];
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  /** For a credit note: the invoice it reduces, and why. */
  againstNumber?: string | null;
  reason?: string | null;
  /** Shown above a test-mode document. */
  note?: string;
};

const money = (paise: number) => (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function below100(n: number) {
  return n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
}
function below1000(n: number) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ones[h]} Hundred` : "", rest ? below100(rest) : ""].filter(Boolean).join(" ");
}
/** Indian numbering in words: 1,23,456 is One Lakh Twenty Three Thousand Four Hundred Fifty Six. */
export function rupeesInWords(paise: number) {
  let n = Math.floor(paise / 100);
  const p = paise % 100;
  if (n === 0 && p === 0) return "Zero Rupees";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  const rupees = parts.length ? `${parts.join(" ")} Rupees` : "";
  return [rupees, p ? `${below100(p)} Paise` : ""].filter(Boolean).join(" and ") + " Only";
}

const css = `
.inv{font:13px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1917;background:#fff;max-width:800px;margin:0 auto;padding:40px;border:1px solid #e7e5e4;border-radius:8px}
.inv h1{font-size:20px;margin:0;letter-spacing:.02em}
.inv .muted{color:#78716c}
.inv .row{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.inv .box{flex:1;min-width:220px}
.inv .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#78716c;margin:0 0 4px}
.inv table{width:100%;border-collapse:collapse;margin-top:24px}
.inv th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#78716c;text-align:left;border-bottom:1px solid #d6d3d1;padding:8px 6px}
.inv td{border-bottom:1px solid #f0efee;padding:8px 6px;vertical-align:top}
.inv .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.inv .totals{margin-left:auto;margin-top:16px;width:320px;max-width:100%}
.inv .totals div{display:flex;justify-content:space-between;padding:3px 0}
.inv .grand{border-top:1px solid #1c1917;margin-top:6px;padding-top:8px!important;font-weight:600;font-size:15px}
.inv .note{background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:6px;margin-bottom:20px}
.inv hr{border:0;border-top:1px solid #e7e5e4;margin:24px 0}
@media print{.inv{border:0;padding:0;max-width:none}.no-print{display:none!important}}
`;

export function InvoiceDocument({ invoice }: { invoice: InvoiceView }) {
  const credit = invoice.kind === "credit_note";
  return (
    <article className="inv">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {invoice.note && <p className="note">{invoice.note}</p>}
      <div className="row">
        <div className="box">
          <h1>{credit ? "CREDIT NOTE" : "TAX INVOICE"}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {credit ? "Credit note" : "Invoice"} no. <strong style={{ color: "#1c1917" }}>{invoice.number}</strong>
            <br />
            Date {day(invoice.issuedOn)}
            <br />
            Booking {invoice.bookingNumber}
            {credit && invoice.againstNumber && (
              <>
                <br />
                Against invoice {invoice.againstNumber}
              </>
            )}
          </p>
        </div>
        <div className="box" style={{ textAlign: "right" }}>
          <strong style={{ fontSize: 15 }}>{invoice.seller.name}</strong>
          {invoice.seller.address && <div style={{ whiteSpace: "pre-line" }}>{invoice.seller.address}</div>}
          {invoice.seller.gstin ? <div>GSTIN {invoice.seller.gstin}</div> : <div className="muted">GSTIN to be added in Settings</div>}
          <div className="muted">
            State {invoice.seller.stateName} ({invoice.seller.stateCode})
          </div>
          {invoice.seller.phone && <div className="muted">+{invoice.seller.phone}</div>}
          {invoice.seller.email && <div className="muted">{invoice.seller.email}</div>}
        </div>
      </div>
      <hr />
      <div className="row">
        <div className="box">
          <p className="label">Billed to</p>
          <strong>{invoice.buyer.name}</strong>
          {invoice.buyer.gstin && <div>GSTIN {invoice.buyer.gstin}</div>}
          {invoice.buyer.phone && <div className="muted">+{invoice.buyer.phone}</div>}
          {invoice.buyer.email && <div className="muted">{invoice.buyer.email}</div>}
        </div>
        <div className="box" style={{ textAlign: "right" }}>
          <p className="label">Place of supply</p>
          {invoice.seller.stateName} ({invoice.seller.stateCode})
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>SAC</th>
            <th className="num">Qty</th>
            <th className="num">Taxable ₹</th>
            <th className="num">GST</th>
            <th className="num">GST ₹</th>
            <th className="num">Amount ₹</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => (
            <tr key={i}>
              <td>{line.description}</td>
              <td>{line.sac ?? ""}</td>
              <td className="num">
                {line.quantity} {line.quantity === 1 ? line.unit : `${line.unit}s`}
              </td>
              <td className="num">{money(line.taxablePaise)}</td>
              <td className="num">{line.rateBps / 100}%</td>
              <td className="num">{money(line.taxPaise)}</td>
              <td className="num">{money(line.taxablePaise + line.taxPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals">
        <div>
          <span>Taxable value</span>
          <span className="num">₹{money(invoice.taxablePaise)}</span>
        </div>
        <div>
          <span>CGST</span>
          <span className="num">₹{money(invoice.cgstPaise)}</span>
        </div>
        <div>
          <span>SGST</span>
          <span className="num">₹{money(invoice.sgstPaise)}</span>
        </div>
        {invoice.igstPaise > 0 && (
          <div>
            <span>IGST</span>
            <span className="num">₹{money(invoice.igstPaise)}</span>
          </div>
        )}
        <div className="grand">
          <span>{credit ? "Credited" : "Total"}</span>
          <span className="num">₹{money(invoice.totalPaise)}</span>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        {rupeesInWords(invoice.totalPaise)}
      </p>
      {credit && invoice.reason && <p>Reason: {invoice.reason}</p>}
      <hr />
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        This is a computer-made {credit ? "credit note" : "invoice"} and needs no signature. Tax is not payable on reverse charge.
      </p>
    </article>
  );
}
