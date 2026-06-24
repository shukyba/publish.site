"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listConnections } from "../../../lib/api";
import { loadAuth } from "../../../lib/campaign-store";
import { SocialPlatform } from "../../../lib/types";

const PLATFORM_VALUES: SocialPlatform[] = ["linkedin", "x", "facebook"];

function platformFromQuery(value: string | null): SocialPlatform | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return PLATFORM_VALUES.find((item) => item === normalized) ?? null;
}

export default function ConnectionsCallbackPage() {
  const [message, setMessage] = useState("Finishing connection...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = platformFromQuery(params.get("platform"));
    const authed = loadAuth();

    void listConnections(authed).then((result) => {
      const match = platform
        ? result.data?.find((item) => item.platform === platform)
        : result.data?.find((item) => item.status === "connected");

      if (result.ok && match?.status === "connected") {
        setMessage(
          match.accountName
            ? `Connected to ${match.accountName}. You can close this window.`
            : "Connected. You can close this window.",
        );
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "publish-connection-complete", platform: match.platform }, window.location.origin);
        }
        window.setTimeout(() => window.close(), 1200);
        return;
      }

      setMessage("Connection not detected yet. Return to Publish and try again.");
    });
  }, []);

  return (
    <main className="section-shell panel" style={{ marginTop: "48px" }}>
      <h1>Social connection</h1>
      <p>{message}</p>
      <Link className="button button-primary" href="/">
        Back to Publish
      </Link>
    </main>
  );
}
