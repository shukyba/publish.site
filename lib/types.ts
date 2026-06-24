export type SocialPlatform = "linkedin" | "x" | "facebook";

export type CampaignSeed = {
  id: string;
  coreIdea: string;
  platform: SocialPlatform;
  metadata?: Record<string, string>;
  createdAt: string;
};

export type PublishStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type GeneratedPost = {
  id: string;
  day: number;
  text: string;
  selected: boolean;
  status: PublishStatus;
  scheduledFor?: string;
};

export type GeneratedCampaign = {
  id: string;
  seed: CampaignSeed;
  posts: GeneratedPost[];
  generatedAt: string;
};

export type SocialConnection = {
  platform: SocialPlatform;
  status: "connected" | "disconnected" | "connecting" | "error";
  accountName?: string;
  lastError?: string;
  authUrl?: string;
};

export type ScheduleRequest = {
  campaignId: string;
  postIds: string[];
  platform: SocialPlatform;
  scheduleAtISO?: string;
};

export type MockResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type ScheduledPostItem = {
  scheduleId: string;
  schedulePostId: string;
  clientPostId: string;
  dayNumber?: number;
  messageText: string;
  platform: SocialPlatform;
  status: PublishStatus | "canceled";
  publishAtUtc?: string;
};
