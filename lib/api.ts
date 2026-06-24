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

export const SIGN_IN_URL = "https://iam.cliposts.com/sign-in";
export const SIGN_UP_URL = "https://iam.cliposts.com/sign-up";

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PUBLISH_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    defaultBase
  ).replace(/\/$/, "");
}

export function getServerApiBaseUrl(): string {
  return (
    process.env.PUBLISH_API_URL ??
    process.env.NEXT_PUBLIC_PUBLISH_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    defaultBase
  ).replace(/\/$/, "");
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

    const payload = await parseJsonResponse<ApiScheduleResponse>(res);
    const atISO = payload.publishAtUtc ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const scheduledIds = payload.posts.map((item) => item.clientPostId);
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
          publishAtUtc: item.publishAtUtc,
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
