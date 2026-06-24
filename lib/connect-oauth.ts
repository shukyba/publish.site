import { connectPlatform, disconnectPlatform, listConnections } from "./api";
import { MockResult, SocialConnection, SocialPlatform } from "./types";

const POLL_INTERVAL_MS = 2000;
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
            : match?.lastError ?? "Connection was not completed.",
      };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
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

  return pollUntilConnected(platform, isAuthenticated, popup, baseline, Date.now());
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
    return {
      ok: false,
      error: start.data.lastError ?? "Could not start social connection.",
    };
  }

  if (start.data.authUrl) {
    const oauth = await completeOAuthInPopup(platform, start.data.authUrl, isAuthenticated);
    if (!oauth.ok) {
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
