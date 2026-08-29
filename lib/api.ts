import {
  CampaignSeed,
  GeneratedCampaign,
  GeneratedPost,
  MockResult,
  ScheduledPostItem,
  ScheduleRequest,
  SocialConnection,
  SocialPlatform,
} from "./types";
import { getPublishUserId } from "./campaign-store";

const defaultBase = "http://localhost:5238";
const defaultSiteUrl = "https://www.cliposts.com";
const iamBaseUrl = "https://iam.cliposts.com";

function getPublishSiteUrl(): string {
  return (process.env.CLIPOSTS_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl).replace(
    /\/$/,
    "",
  );
}

function buildIamAuthUrl(path: "/sign-in" | "/sign-up" | "/sign-off", redirectTo: string): string {
  return `${iamBaseUrl}${path}?url=${encodeURIComponent(redirectTo)}`;
}

export const SIGN_IN_URL = buildIamAuthUrl("/sign-in", `${getPublishSiteUrl()}/publish`);
export const SIGN_UP_URL = buildIamAuthUrl("/sign-up", `${getPublishSiteUrl()}/publish/?signup=true`);
export const SIGN_OFF_URL = buildIamAuthUrl("/sign-off", `${getPublishSiteUrl()}/publish`);

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBase).replace(/\/$/, "");
}

export function getServerApiBaseUrl(): string {
  return (process.env.PUBLISH_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBase).replace(/\/$/, "");
}

function platformToApi(platform: SocialPlatform): "LinkedIn" | "X" | "Facebook" {
  if (platform === "x") return "X";
  if (platform === "facebook") return "Facebook";
  return "LinkedIn";
}

function platformFromApi(platform: string): SocialPlatform {
  const value = platform.toLowerCase();
  if (value === "x") return "x";
  if (value === "facebook") return "facebook";
  return "linkedin";
}

function connectionStatusFromApi(status: string): SocialConnection["status"] {
  const value = status.toLowerCase();
  if (value === "connected") return "connected";
  if (value === "connecting") return "connecting";
  if (value === "error") return "error";
  return "disconnected";
}

function publishStatusFromApi(status: string): GeneratedPost["status"] {
  const value = status.toLowerCase();
  if (value === "scheduled") return "scheduled";
  if (value === "published") return "published";
  if (value === "failed") return "failed";
  if (value === "queued" || value === "updated") return "scheduled";
  if (value === "publishing") return "publishing";
  return "draft";
}

function authHeaders(isAuthenticated: boolean): HeadersInit {
  if (!isAuthenticated) return {};
  const userId = getPublishUserId();
  return userId ? { "X-Publish-User-Id": userId } : {};
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof data.message === "string" && data.message) ||
      (typeof data.error === "string" && data.error) ||
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.title === "string" && data.title) ||
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

type ApiGeneratedCampaign = {
  id: string;
  seed: {
    id: string;
    coreIdea: string;
    platform: string;
    metadata?: Record<string, string>;
    createdAt: string;
  };
  posts: Array<{
    id: string;
    day: number;
    text: string;
    selected: boolean;
    status: string;
    scheduledFor?: string;
  }>;
  generatedAt: string;
};

type ApiSocialConnection = {
  platform: string;
  status: string;
  accountName?: string;
  lastError?: string;
  authUrl?: string;
};

type ApiScheduleResponse = {
  scheduleId: string;
  platform: string;
  status: string;
  publishAtUtc?: string;
  posts: Array<{
    schedulePostId: string;
    clientPostId: string;
    dayNumber?: number;
    messageText?: string;
    status: string;
    publishAtUtc?: string;
  }>;
};

type ApiScheduleListResponse = {
  items: ApiScheduleResponse[];
  total: number;
};

export async function generateCampaign(seed: CampaignSeed): Promise<MockResult<GeneratedCampaign>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/campaigns/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coreIdea: seed.coreIdea,
        platform: platformToApi(seed.platform),
        metadata: seed.metadata,
      }),
    });

    const payload = await parseJsonResponse<ApiGeneratedCampaign>(res);
    return {
      ok: true,
      data: {
        id: payload.id,
        seed: {
          id: payload.seed.id,
          coreIdea: payload.seed.coreIdea,
          platform: platformFromApi(payload.seed.platform),
          metadata: payload.seed.metadata,
          createdAt: payload.seed.createdAt,
        },
        posts: payload.posts.map((post) => ({
          id: post.id,
          day: post.day,
          text: post.text,
          selected: post.selected,
          status: publishStatusFromApi(post.status),
          scheduledFor: post.scheduledFor,
        })),
        generatedAt: payload.generatedAt,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not generate campaign." };
  }
}

/**
 * Pushes a browser-side failure into the server log. Best effort: the connect popup
 * closes quickly, so the browser console is usually lost by the time anyone looks.
 */
export async function reportClientError(report: {
  stage: string;
  platform?: string;
  message: string;
  details?: string;
}): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/publish/connections/client-errors`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...authHeaders(true) },
      body: JSON.stringify(report),
    });
  } catch {
    // Never let diagnostics break the flow.
  }
}

export async function listConnections(isAuthenticated: boolean): Promise<MockResult<SocialConnection[]>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/connections`, {
      cache: "no-store",
      headers: authHeaders(isAuthenticated),
    });
    const payload = await parseJsonResponse<ApiSocialConnection[]>(res);
    return {
      ok: true,
      data: payload.map((item) => ({
        platform: platformFromApi(item.platform),
        status: connectionStatusFromApi(item.status),
        accountName: item.accountName,
        lastError: item.lastError,
        authUrl: item.authUrl,
      })),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not load connections." };
  }
}

export type PublishQuotaStatus = {
  planId: number;
  creditsRemaining: number | null;
  hasPaidPlan: boolean;
  validUntil: string | null;
  allowedPlatforms: string[];
};

export async function getPublishQuota(isAuthenticated: boolean): Promise<MockResult<PublishQuotaStatus>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/quota`, {
      cache: "no-store",
      headers: authHeaders(isAuthenticated),
    });
    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const message = typeof payload.message === "string" ? payload.message : res.statusText;
      return { ok: false, error: message || "Could not load plan quota." };
    }

    return {
      ok: true,
      data: {
        planId: typeof payload.planId === "number" ? payload.planId : 22,
        creditsRemaining:
          typeof payload.creditsRemaining === "number" ? payload.creditsRemaining : null,
        hasPaidPlan: payload.hasPaidPlan === true,
        validUntil: typeof payload.validUntil === "string" ? payload.validUntil : null,
        allowedPlatforms: Array.isArray(payload.allowedPlatforms)
          ? payload.allowedPlatforms.filter((item): item is string => typeof item === "string")
          : [],
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not load plan quota." };
  }
}

export async function connectPlatform(
  platform: SocialPlatform,
  isAuthenticated: boolean,
): Promise<MockResult<SocialConnection>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/connections/${platformToApi(platform)}/connect`, {
      method: "POST",
      headers: authHeaders(isAuthenticated),
    });
    const payload = await parseJsonResponse<ApiSocialConnection>(res);
    return {
      ok: true,
      data: {
        platform: platformFromApi(payload.platform),
        status: connectionStatusFromApi(payload.status),
        accountName: payload.accountName,
        lastError: payload.lastError,
        authUrl: payload.authUrl,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not connect account." };
  }
}

export async function disconnectPlatform(
  platform: SocialPlatform,
  isAuthenticated: boolean,
): Promise<MockResult<SocialConnection>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/connections/${platformToApi(platform)}/disconnect`, {
      method: "POST",
      headers: authHeaders(isAuthenticated),
    });
    const payload = await parseJsonResponse<ApiSocialConnection>(res);
    return {
      ok: true,
      data: {
        platform: platformFromApi(payload.platform),
        status: connectionStatusFromApi(payload.status),
        accountName: payload.accountName,
        lastError: payload.lastError,
        authUrl: payload.authUrl,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not disconnect account." };
  }
}

export type FacebookPageOption = {
  pageId: string;
  pageName: string;
};

export async function listFacebookPages(
  isAuthenticated: boolean,
): Promise<MockResult<FacebookPageOption[]>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/connections/facebook/pages`, {
      cache: "no-store",
      headers: authHeaders(isAuthenticated),
    });
    const payload = await parseJsonResponse<FacebookPageOption[]>(res);
    return {
      ok: true,
      data: payload.map((item) => ({
        pageId: item.pageId,
        pageName: item.pageName,
      })),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not load Facebook pages." };
  }
}

export async function selectFacebookPage(
  pageId: string,
  isAuthenticated: boolean,
): Promise<MockResult<SocialConnection>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/connections/facebook/pages/select`, {
      method: "POST",
      headers: {
        ...authHeaders(isAuthenticated),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageId }),
    });
    const payload = await parseJsonResponse<ApiSocialConnection>(res);
    return {
      ok: true,
      data: {
        platform: platformFromApi(payload.platform),
        status: connectionStatusFromApi(payload.status),
        accountName: payload.accountName,
        lastError: payload.lastError,
        authUrl: payload.authUrl,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not select Facebook page." };
  }
}

export async function schedulePosts(
  request: ScheduleRequest,
  campaign: GeneratedCampaign,
  isAuthenticated: boolean,
): Promise<MockResult<{ scheduledIds: string[]; atISO: string }>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(isAuthenticated) },
      body: JSON.stringify({
        platform: platformToApi(request.platform),
        selectedPostIds: request.postIds,
        publishAtUtc: request.scheduleAtISO,
        posts: campaign.posts.map((post) => ({
          clientPostId: post.id,
          dayNumber: post.day,
          messageText: post.text,
        })),
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const code =
        (typeof payload.code === "string" ? payload.code : "") ||
        (typeof payload.Code === "string" ? payload.Code : "") ||
        (res.status === 403 ? "PLATFORM_NOT_ON_PLAN" : "") ||
        (res.status === 402 ? "POST_LIMIT_REACHED" : "") ||
        (res.status === 401 ? "AUTH_REQUIRED" : "");
      const message =
        (typeof payload.message === "string" ? payload.message : "") ||
        (typeof payload.Message === "string" ? payload.Message : "") ||
        res.statusText;
      if (code === "POST_LIMIT_REACHED") {
        return {
          ok: false,
          code,
          error:
            message ||
            "You have used all posts included in your plan for this month. Upgrade your plan or schedule fewer posts.",
        };
      }
      if (code === "SIGN_IN_REQUIRED" || code === "AUTH_REQUIRED") {
        return {
          ok: false,
          code,
          error: message || "Sign in with a Cliposts account to schedule posts.",
        };
      }
      if (code === "PLATFORM_NOT_ON_PLAN") {
        return {
          ok: false,
          code,
          error: message || "This platform is not included on your current plan.",
        };
      }
      return { ok: false, code: code || undefined, error: message || "Could not schedule posts." };
    }

    const schedule = payload as ApiScheduleResponse;
    const atISO = schedule.publishAtUtc ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const scheduledIds = schedule.posts.map((item) => item.clientPostId);
    return { ok: true, data: { scheduledIds, atISO } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not schedule posts." };
  }
}

export async function listScheduledPosts(isAuthenticated: boolean): Promise<MockResult<ScheduledPostItem[]>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/schedules?take=100`, {
      cache: "no-store",
      headers: authHeaders(isAuthenticated),
    });
    const payload = await parseJsonResponse<ApiScheduleListResponse>(res);
    return {
      ok: true,
      data: payload.items.flatMap((item) => {
        if (!item.posts?.length) {
          // Backward compatibility: older DB proc signatures can return parent
          // schedules without child SchedulePosts rows.
          return [
            {
              scheduleId: item.scheduleId,
              schedulePostId: item.scheduleId,
              clientPostId: item.scheduleId,
              dayNumber: undefined,
              messageText: "",
              platform: platformFromApi(item.platform),
              status: publishStatusFromApi(item.status),
              publishAtUtc: item.publishAtUtc,
            },
          ];
        }

        return item.posts.map((post) => ({
          scheduleId: item.scheduleId,
          schedulePostId: post.schedulePostId,
          clientPostId: post.clientPostId,
          dayNumber: post.dayNumber,
          messageText: post.messageText ?? "",
          platform: platformFromApi(item.platform),
          status: publishStatusFromApi(post.status || item.status),
          publishAtUtc: post.publishAtUtc ?? item.publishAtUtc,
        }));
      }),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not load scheduled posts." };
  }
}

export async function cancelScheduledPost(
  scheduleId: string,
  schedulePostId: string,
  isAuthenticated: boolean,
): Promise<MockResult<ScheduledPostItem>> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/publish/schedules/${encodeURIComponent(scheduleId)}/posts/${encodeURIComponent(schedulePostId)}/cancel`,
      {
        method: "POST",
        headers: authHeaders(isAuthenticated),
      },
    );
    const payload = await parseJsonResponse<ApiScheduleResponse>(res);
    const canceledPost = payload.posts.find((post) => post.schedulePostId === schedulePostId) ?? payload.posts[0];
    return {
      ok: true,
      data: {
        scheduleId: payload.scheduleId,
        schedulePostId: canceledPost?.schedulePostId ?? schedulePostId,
        clientPostId: canceledPost?.clientPostId ?? schedulePostId,
        dayNumber: canceledPost?.dayNumber,
        messageText: canceledPost?.messageText ?? "",
        platform: platformFromApi(payload.platform),
        status: publishStatusFromApi(canceledPost?.status || payload.status),
        publishAtUtc: payload.publishAtUtc,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not cancel scheduled post." };
  }
}

export async function cancelScheduledSchedule(
  scheduleId: string,
  isAuthenticated: boolean,
): Promise<MockResult<{ scheduleId: string }>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/publish/schedules/${encodeURIComponent(scheduleId)}/cancel`, {
      method: "POST",
      headers: authHeaders(isAuthenticated),
    });
    const payload = await parseJsonResponse<ApiScheduleResponse>(res);
    return { ok: true, data: { scheduleId: payload.scheduleId } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not cancel scheduled batch." };
  }
}
