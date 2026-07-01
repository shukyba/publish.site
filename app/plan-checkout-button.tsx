"use client";

import { useRef, useState } from "react";
import { postStripeCheckout } from "../lib/cliposts-api";

export function PlanCheckoutButton({
  planId,
  className,
  children,
}: {
  planId: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function onCheckout() {
    if (inFlight.current) return;

    inFlight.current = true;
    setError(null);
    setPending(true);

    try {
      const url = await postStripeCheckout(planId);
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
      setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="plan-checkout-wrapper">
      <button
        type="button"
        className={className}
        aria-busy={pending}
        onClick={() => void onCheckout()}
      >
        {pending ? "Redirecting…" : children}
      </button>
      {error ? (
        <p className="method-note" role="alert" style={{ marginTop: "0.5rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
