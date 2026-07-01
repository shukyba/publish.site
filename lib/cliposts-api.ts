import { getAccountId } from "./account";
import { withMountPath } from "./mount-path";

// Production talks to the deployed cliposts API; local dev talks to the local API (localhost:5010).
const defaultClipostsApiBase =
  process.env.NODE_ENV === "production"
    ? "https://cliposts-api-b2d3bcapd8euaser.westeurope-01.azurewebsites.net"
    : "http://localhost:5010";

export function getClipostsApiBaseUrl(): string {
  return (process.env.CLIPOSTS_API_URL ?? process.env.NEXT_PUBLIC_CLIPOSTS_API_URL ?? defaultClipostsApiBase).replace(
    /\/$/,
    "",
  );
}

export type PublishPlanFromApi = {
  planId: number;
  name?: string;
  credits: number;
};

export async function fetchPublishPlansFromApi(): Promise<PublishPlanFromApi[]> {
  const response = await fetch(`${getClipostsApiBaseUrl()}/api/subscription/plans?product=publish`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { plans?: PublishPlanFromApi[] };
  return data.plans ?? [];
}

export async function postStripeCheckout(planId: number, accountId?: string): Promise<string> {
  const resolvedAccountId = accountId ?? getAccountId() ?? undefined;
  const res = await fetch(`${getClipostsApiBaseUrl()}/api/stripe/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, accountId: resolvedAccountId }),
  });
  const data = await parseJsonResponse<{ url: string }>(res);
  return data.url;
}

export async function postSubscriptionClaim(accountId?: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(withMountPath("/api/subscription/claim"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: accountId ?? getAccountId() }),
  });
  if (res.status === 204) return { ok: true };
  return parseJsonResponse(res);
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof data.error === "string" && data.error) ||
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.title === "string" && data.title) ||
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}
