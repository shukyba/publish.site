import {
  CampaignSeed,
  GeneratedCampaign,
  GeneratedPost,
  MockResult,
  ScheduleRequest,
  SocialConnection,
  SocialPlatform,
} from "./types";

const DAY_ANGLE_LIBRARY = [
  "A sharp hook that reframes the problem from a practical angle.",
  "A common mistake and a better way to approach it.",
  "A mini-framework your audience can apply today.",
  "A story-style post showing a before and after shift.",
  "A contrarian take that challenges default assumptions.",
  "A checklist post with a clear, scannable structure.",
  "A myth vs reality format with one useful proof point.",
  "An objection-handling post that removes hesitation.",
  "A step-by-step workflow for consistent execution.",
  "A results-focused angle tied to measurable outcomes.",
  "A behind-the-scenes lesson from implementation.",
  "A question-led post designed to spark comments.",
  "A practical template followers can copy and adapt.",
  "A recap post that ties the campaign into one clear takeaway.",
];

const PLATFORM_STYLE: Record<SocialPlatform, string> = {
  linkedin: "Use short blocks, practical framing, and a professional but direct tone.",
  x: "Keep it compact and punchy with one idea per paragraph and concise lines.",
  facebook: "Use a warmer conversational tone with plain language and clear examples.",
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toTitle(platform: SocialPlatform) {
  if (platform === "x") return "X";
  return platform[0].toUpperCase() + platform.slice(1);
}

function buildPostText(seed: CampaignSeed, day: number) {
  const angle = DAY_ANGLE_LIBRARY[(day - 1) % DAY_ANGLE_LIBRARY.length];
  return [
    `Day ${day} — ${toTitle(seed.platform)} follow-up`,
    "",
    `Core idea: ${seed.coreIdea}`,
    "",
    angle,
    PLATFORM_STYLE[seed.platform],
    "",
    "Close with one direct CTA or question to continue the conversation.",
  ].join("\n");
}

export async function generateCampaign(seed: CampaignSeed): Promise<MockResult<GeneratedCampaign>> {
  await wait(850);
  if (seed.coreIdea.trim().length < 12) {
    return { ok: false, error: "Please add more detail so the campaign can generate useful variations." };
  }

  const posts: GeneratedPost[] = Array.from({ length: 14 }, (_, index) => {
    const day = index + 1;
    return {
      id: uid("post"),
      day,
      text: buildPostText(seed, day),
      selected: true,
      status: "draft",
    };
  });

  return {
    ok: true,
    data: {
      id: uid("campaign"),
      seed,
      posts,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function regeneratePost(
  campaign: GeneratedCampaign,
  postId: string,
): Promise<MockResult<GeneratedPost>> {
  await wait(700);
  const post = campaign.posts.find((item) => item.id === postId);
  if (!post) return { ok: false, error: "Could not find that post to regenerate." };
  return {
    ok: true,
    data: {
      ...post,
      text: `${buildPostText(campaign.seed, post.day)}\n\nAlternate angle refresh generated at ${new Date().toLocaleTimeString()}.`,
      status: "draft",
      scheduledFor: undefined,
    },
  };
}

export async function connectPlatform(
  current: SocialConnection,
): Promise<MockResult<SocialConnection>> {
  await wait(900);
  if (Math.random() < 0.1) {
    return {
      ok: false,
      error: `Mock OAuth failed while connecting ${toTitle(current.platform)}. Please try again.`,
    };
  }
  return {
    ok: true,
    data: {
      platform: current.platform,
      status: "connected",
      accountName: `mock_${current.platform}_account`,
    },
  };
}

export async function disconnectPlatform(
  current: SocialConnection,
): Promise<MockResult<SocialConnection>> {
  await wait(400);
  return {
    ok: true,
    data: {
      platform: current.platform,
      status: "disconnected",
    },
  };
}

export async function schedulePosts(
  request: ScheduleRequest,
): Promise<MockResult<{ scheduledIds: string[]; atISO: string }>> {
  await wait(950);
  if (request.postIds.length === 0) {
    return { ok: false, error: "Select at least one post to schedule." };
  }
  if (Math.random() < 0.08) {
    return { ok: false, error: "Mock scheduling service is temporarily unavailable. Please retry." };
  }
  const atISO = request.scheduleAtISO ?? new Date(Date.now() + 1000 * 60 * 60).toISOString();
  return {
    ok: true,
    data: {
      scheduledIds: request.postIds,
      atISO,
    },
  };
}
