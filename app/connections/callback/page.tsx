"use client";

import { useEffect, useState } from "react";
import { withMountPath } from "../../../lib/mount-path";
import {
  listConnections,
  listFacebookPages,
  selectFacebookPage,
  reportClientError,
  FacebookPageOption,
} from "../../../lib/api";
import { loadAuth } from "../../../lib/campaign-store";
import { SocialPlatform } from "../../../lib/types";

const PLATFORM_VALUES: SocialPlatform[] = ["linkedin", "x", "facebook"];

function platformFromQuery(value: string | null): SocialPlatform | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return PLATFORM_VALUES.find((item) => item === normalized) ?? null;
}

function notifyOpener(platform: SocialPlatform | null, status: "connected" | "error") {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(
      { type: "publish-connection-complete", platform, status },
      window.location.origin,
    );
  }
}

export default function ConnectionsCallbackPage() {
  const [message, setMessage] = useState("Finishing connection...");
  const [pages, setPages] = useState<FacebookPageOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [selecting, setSelecting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = platformFromQuery(params.get("platform"));
    const status = (params.get("status") ?? "").toLowerCase();
    const authed = loadAuth();

    if (status === "error") {
      setMessage("Connection failed. During Facebook login click Edit settings and allow your Pages, then try again.");
      // Prefer lastError from API if available.
      void listConnections(authed).then((result) => {
        const match = platform
          ? result.data?.find((item) => item.platform === platform)
          : undefined;
        if (match?.lastError) {
          setMessage(match.lastError);
        }
        void reportClientError({
          stage: "callback-status-error",
          platform: platform ?? undefined,
          message: match?.lastError ?? "OAuth callback returned status=error",
          details: `url=${window.location.href}`,
        });
      });
      notifyOpener(platform, "error");
      window.setTimeout(() => window.close(), 2500);
      return;
    }

    if (status === "select_page" && platform === "facebook") {
      setMessage("Loading the Facebook Pages you just approved...");
      setShowPicker(true);
      setLoadingPages(true);
      void listFacebookPages(authed).then((result) => {
        setLoadingPages(false);
        if (!result.ok || !result.data || result.data.length === 0) {
          setShowPicker(false);
          const reason = result.error ?? "No Facebook Pages were found for this account.";
          setMessage(reason);
          void reportClientError({
            stage: "callback-list-pages-failed",
            platform: "facebook",
            message: reason,
            details: `ok=${result.ok}, count=${result.data?.length ?? 0}`,
          });
          notifyOpener(platform, "error");
          return;
        }
        setMessage("Select the Facebook Page you want to publish to.");
        setPages(result.data);
        setSelectedPageId(result.data[0].pageId);
      });
      return;
    }

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
        notifyOpener(match.platform, "connected");
        window.setTimeout(() => window.close(), 1200);
        return;
      }

      if (status === "connected") {
        setMessage("Connected. You can close this window.");
        notifyOpener(platform, "connected");
        window.setTimeout(() => window.close(), 1200);
        return;
      }

      setMessage("Connection not detected yet. Return to Publish and try again.");
    });
  }, []);

  async function handleSelectPage() {
    if (!selectedPageId) return;
    setSelecting(true);
    const authed = loadAuth();
    const result = await selectFacebookPage(selectedPageId, authed);
    setSelecting(false);
    if (!result.ok || !result.data || result.data.status !== "connected") {
      const reason = result.error ?? "Could not connect the selected page.";
      setMessage(reason);
      void reportClientError({
        stage: "callback-select-page-failed",
        platform: "facebook",
        message: reason,
        details: `pageId=${selectedPageId}, status=${result.data?.status ?? "none"}`,
      });
      notifyOpener("facebook", "error");
      return;
    }

    setShowPicker(false);
    setMessage(
      result.data.accountName
        ? `Connected to ${result.data.accountName}. You can close this window.`
        : "Connected. You can close this window.",
    );
    notifyOpener("facebook", "connected");
    window.setTimeout(() => window.close(), 1200);
  }

  return (
    <main className="section-shell panel" style={{ marginTop: "48px" }}>
      <h1>Social connection</h1>
      <p>{message}</p>

      {loadingPages && (
        <p style={{ opacity: 0.7 }}>
          This can take a few seconds while we check every Page and Business portfolio you granted.
        </p>
      )}

      {showPicker && pages.length > 0 && (
        <div style={{ display: "grid", gap: "12px", marginTop: "16px", maxWidth: "420px" }}>
          {pages.map((page) => (
            <label
              key={page.pageId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="facebook-page"
                value={page.pageId}
                checked={selectedPageId === page.pageId}
                onChange={() => setSelectedPageId(page.pageId)}
              />
              <span>{page.pageName}</span>
            </label>
          ))}
          <button
            type="button"
            className="button button-primary"
            disabled={selecting || !selectedPageId}
            onClick={() => void handleSelectPage()}
          >
            {selecting ? "Connecting..." : "Connect selected Page"}
          </button>
        </div>
      )}

    </main>
  );
}
