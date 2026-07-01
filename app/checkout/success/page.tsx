"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAccountId } from "../../../lib/account";
import { postSubscriptionClaim } from "../../../lib/cliposts-api";
import { SIGN_UP_URL } from "../../../lib/api";
import { withMountPath } from "../../../lib/mount-path";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "guest_pending" | "error">("loading");
  const [error, setError] = useState("");
  const [emailHint, setEmailHint] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setError("No checkout session was found.");
      return;
    }

    const run = async () => {
      try {
        const prepRes = await fetch(withMountPath("/api/subscription/prepare-claim"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!prepRes.ok) {
          const data = (await prepRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to prepare subscription claim.");
        }

        const prep = (await prepRes.json()) as { mode?: string; emailHint?: string | null };
        setEmailHint(prep.emailHint ?? null);

        const accountId = getAccountId();
        if (!accountId) {
          setStatus("guest_pending");
          return;
        }

        const claim = await postSubscriptionClaim(accountId);
        if (claim.error) throw new Error(claim.error);
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to verify checkout.");
      }
    };

    void run();
  }, [sessionId]);

  if (status === "loading") {
    return (
      <main className="checkout-success-shell">
        <h1>Activating your subscription…</h1>
        <p>Please wait while we confirm your payment with Stripe.</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="checkout-success-shell">
        <h1>Something went wrong</h1>
        <p>{error}</p>
        <Link href={withMountPath("/#pricing")} className="button">
          Back to pricing
        </Link>
      </main>
    );
  }

  if (status === "guest_pending") {
    return (
      <main className="checkout-success-shell">
        <h1>Payment received</h1>
        <p>Your Publish subscription is ready. Sign in to connect accounts and schedule campaigns.</p>
        {emailHint ? (
          <p className="checkout-success-hint">
            We linked this purchase to <strong>{emailHint}</strong>. Use that email when you sign up.
          </p>
        ) : null}
        <div className="checkout-success-actions">
          <a href={SIGN_UP_URL} className="button">
            Sign up
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-success-shell">
      <h1>Subscription active</h1>
      <p>Your Publish plan is attached to this account. You can connect social accounts and schedule campaigns.</p>
      <Link href={withMountPath("/#generator")} className="button">
        Open Publish
      </Link>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="checkout-success-shell">
          <h1>Loading…</h1>
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
