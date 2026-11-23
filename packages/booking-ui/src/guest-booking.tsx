"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupees } from "./pricing";
import { payWithRazorpay, type CheckoutOrder, type ConfirmResult, type PaymentAnswer } from "./online";

type PayResult = { ok: true; order: CheckoutOrder } | { ok: false; error: string };

/** Pays what the guest still owes, from their booking page. */
export function PayBalanceButton({ amountPaise, pay, confirm, prefill }: { amountPaise: number; pay: () => Promise<PayResult>; confirm: (answer: PaymentAnswer) => Promise<ConfirmResult>; prefill: { name?: string; phone?: string; email?: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    try {
      const started = await pay();
      if (!started.ok) return setError(started.error);
      const answer = await payWithRazorpay(started.order, prefill);
      if ("closed" in answer) return setError(answer.error);
      const result = await confirm(answer);
      if (!result.ok) setError(`${result.error} If money left your account, this page will update shortly.`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The payment didn't start. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-2">
      <button type="button" onClick={go} disabled={busy} className="min-h-12 rounded-bk-control bg-bk-accent px-6 bk-button text-bk-accent-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50">
        {busy ? "Waiting for the payment…" : `Pay ${formatRupees(amountPaise / 100)}`}
      </button>
      {error && (
        <p role="alert" className="text-[0.9rem] text-bk-alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * While a payment may be on its way: asks the server to check with
 * Razorpay at once, then every 5 seconds for two minutes, and reloads the
 * page's data each time.
 */
export function RefreshWhileWaiting({ check }: { check: () => Promise<boolean> }) {
  const router = useRouter();
  // Each refresh brings a new `check`; the timer keeps running with the latest.
  const latest = useRef(check);
  useEffect(() => {
    latest.current = check;
  }, [check]);
  useEffect(() => {
    let count = 0;
    let stopped = false;
    const tick = async () => {
      count += 1;
      await latest.current().catch(() => false);
      if (!stopped) router.refresh();
    };
    void tick();
    const timer = setInterval(() => {
      if (count >= 24) return clearInterval(timer);
      void tick();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [router]);
  return null;
}

/**
 * Cancels the booking from the guest's page (BK-07), after the guest
 * confirms what the resort's rules give back.
 */
export function CancelBookingButton({ refundText, cancel }: { refundText: string; cancel: () => Promise<{ ok: true; message: string } | { ok: false; error: string }> }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="bk-button min-h-11 rounded-bk-control border border-bk-line px-4 text-[0.95rem] hover:border-bk-alert hover:text-bk-alert">
        Cancel this booking
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Cancel this booking?" className="grid gap-3 rounded-[calc(var(--bk-radius)*0.6)] border border-bk-alert/40 bg-bk-alert/5 p-4">
      <p className="font-medium">Cancel this booking?</p>
      <p className="text-[0.92rem] text-bk-muted">{refundText} This can&apos;t be undone.</p>
      {error && (
        <p role="alert" className="text-[0.9rem] text-bk-alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const result = await cancel().catch(() => ({ ok: false as const, error: "That didn't go through. Please call the resort." }));
            setBusy(false);
            if (result.ok) router.refresh();
            else setError(result.error);
          }}
          className="bk-button min-h-11 rounded-bk-control bg-bk-alert px-4 text-white disabled:opacity-60"
        >
          {busy ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button type="button" disabled={busy} onClick={() => setAsking(false)} className="bk-button min-h-11 rounded-bk-control border border-bk-line px-4">
          Keep my booking
        </button>
      </div>
    </div>
  );
}
