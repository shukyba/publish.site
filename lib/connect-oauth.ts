import { connectPlatform, disconnectPlatform, listConnections, reportClientError } from "./api";
import { MockResult, SocialConnection, SocialPlatform } from "./types";

const POLL_INTERVAL_MS = 5000;
const POLL_INTERVAL_POPUP_OPEN_MS = 10000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const POPUP_CLOSED_GRACE_MS = 5000;

function findPlatformConnection(
  connections: SocialConnection[] | undefined,
  platform: SocialPlatform,
): SocialConnection | undefined {
  return connections?.find((item) => item.platform === platform);
}

function connectionFingerprint(connection: SocialConnection | undefined): string {
  if (!connection) return "missing";
  return `${connection.status}:${connection.accountName ?? ""}`;
}

function hasNewConnection(
  baseline: SocialConnection | undefined,
  current: SocialConnection | undefined,
): boolean {
  if (!current || current.status !== "connected") return false;
  return connectionFingerprint(baseline) !== connectionFingerprint(current);
}

export async function refreshPlatformConnections(
  isAuthenticated: boolean,
): Promise<MockResult<SocialConnection[]>> {
  return listConnections(isAuthenticated);
}

async function pollUntilConnected(
  platform: SocialPlatform,
  isAuthenticated: boolean,
  popup: Window | null,
  baseline: SocialConnection | undefined,
  openedAt: number,
): Promise<{ ok: true; connection: SocialConnection } | { ok: false; error: string }> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const popupOpen = Boolean(popup && !popup.closed);
    const result = await listConnections(isAuthenticated);
    const match = findPlatformConnection(result.data, platform);

    if (hasNewConnection(baseline, match) && match) {
      return { ok: true, connection: match };
    }

    const popupClosedGraceElapsed = Date.now() - openedAt >= POPUP_CLOSED_GRACE_MS;
    if (popup?.closed && popupClosedGraceElapsed) {
      return {
        ok: false,
        error:
          match?.status === "connected"
            ? "Connection was not updated. Disconnect first if you want to choose a different page."
            : match?.lastError ??
              "Facebook finished in the popup, but Publish never received the redirect. Click Got it if shown, allow the redirect to localhost, and for local dev use the HTTPS callback (https://localhost:7247).",
      };
    }

    await new Promise((resolve) =>
      setTimeout(resolve, popupOpen ? POLL_INTERVAL_POPUP_OPEN_MS : POLL_INTERVAL_MS),
    );
  }

  return {
    ok: false,
    error:
      "Connection timed out. Finish login and page selection in the popup, then try again if needed.",
  };
}

async function completeOAuthInPopup(
  platform: SocialPlatform,
  authUrl: string,
  isAuthenticated: boolean,
): Promise<{ ok: true; connection: SocialConnection } | { ok: false; error: string }> {
  const baselineResult = await listConnections(isAuthenticated);
  const baseline = findPlatformConnection(baselineResult.data, platform);

  const popup = window.open(authUrl, "publish-oauth", "popup,width=560,height=760");
  if (!popup) {
    return {
      ok: false,
      error: "Popup blocked. Allow popups for this site and try again.",
    };
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (
      result: { ok: true; connection: SocialConnection } | { ok: false; error: string },
    ) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | { type?: string; platform?: string; status?: string }
        | null;
      if (!data || data.type !== "publish-connection-complete") return;
      if (data.platform && data.platform !== platform) return;

      if (data.status === "error") {
        // Surface the server's real reason instead of a generic message.
        void listConnections(isAuthenticated).then((result) => {
          const match = findPlatformConnection(result.data, platform);
          const reason = match?.lastError ?? "Connection failed. Please try again.";
          void reportClientError({
            stage: "oauth-popup-error",
            platform,
            message: reason,
            details: `connectionStatus=${match?.status ?? "unknown"}`,
          });
          finish({ ok: false, error: reason });
        });
        return;
      }

      void listConnections(isAuthenticated).then((result) => {
        const match = findPlatformConnection(result.data, platform);
        if (match?.status === "connected") {
          finish({ ok: true, connection: match });
        }
      });
    };

    window.addEventListener("message", onMessage);

    void pollUntilConnected(platform, isAuthenticated, popup, baseline, Date.now()).then(finish);
  });
}

export async function runPlatformConnect(
  platform: SocialPlatform,
  isAuthenticated: boolean,
): Promise<MockResult<SocialConnection>> {
  const start = await connectPlatform(platform, isAuthenticated);
  if (!start.ok || !start.data) {
    return start;
  }

  if (start.data.status === "connected") {
    return start;
  }

  if (start.data.status === "error") {
    const error = start.data.lastError ?? "Could not start social connection.";
    void reportClientError({ stage: "connect-start-error", platform, message: error });
    return { ok: false, error };
  }

  if (start.data.authUrl) {
    const oauth = await completeOAuthInPopup(platform, start.data.authUrl, isAuthenticated);
    if (!oauth.ok) {
      void reportClientError({ stage: "connect-popup-failed", platform, message: oauth.error });
      return { ok: false, error: oauth.error };
    }
    return { ok: true, data: oauth.connection };
  }

  const baselineResult = await listConnections(isAuthenticated);
  const baseline = findPlatformConnection(baselineResult.data, platform);
  const polled = await pollUntilConnected(platform, isAuthenticated, null, baseline, Date.now());
  if (!polled.ok) {
    return { ok: false, error: polled.error };
  }
  return { ok: true, data: polled.connection };
}

export async function runPlatformDisconnect(
  platform: SocialPlatform,
  isAuthenticated: boolean,
): Promise<MockResult<SocialConnection>> {
  return disconnectPlatform(platform, isAuthenticated);
}
