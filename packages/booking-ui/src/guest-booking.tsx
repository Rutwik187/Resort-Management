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
