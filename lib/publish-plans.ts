import type { SocialPlatform } from "./types";

export const PUBLISH_PLATFORMS = ["Facebook", "X", "LinkedIn"] as const;
export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];

/** Display order for platform lists in UI */
export const PUBLISH_PLATFORM_DISPLAY_ORDER: PublishPlatform[] = ["X", "Facebook", "LinkedIn"];

export type PublishPricingPlan = {
  name: string;
  stripePlanId?: number;
  price: string;
  posts: number;
  platforms: PublishPlatform[];
  description: string;
  features: string[];
  cta?: string;
  ctaNote?: string;
  featured?: boolean;
};

const BASE_PLANS: PublishPricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    posts: 14,
    platforms: ["Facebook"],
    description: "Try the full flow on Facebook.",
    features: ["Generate posts from one idea", "Edit and regenerate posts", "Preview scheduling flow"],
    ctaNote: "No signup required",
  },
  {
    name: "Starter",
    stripePlanId: 20,
    price: "$19",
    posts: 60,
    platforms: ["X", "Facebook"],
    description: "For creators on X and Facebook.",
    features: ["Schedule daily posts", "Reschedule anytime", "Post history (coming soon)"],
    cta: "Start Starter",
  },
  {
    name: "Pro",
    stripePlanId: 21,
    price: "$49",
    posts: 180,
    platforms: ["X", "Facebook"],
    description: "For creators on X and Facebook.",
    features: ["Publish across channels", "Bulk scheduling", "Priority support"],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Scale",
    stripePlanId: 23,
    price: "$99",
    posts: 450,
    platforms: ["Facebook", "X", "LinkedIn"],
    description: "For teams publishing everywhere at volume.",
    features: ["Highest monthly volume", "All channels included", "Dedicated support"],
    ctaNote: "Coming soon",
  },
];

export async function getPublishPricingPlans(): Promise<PublishPricingPlan[]> {
  return BASE_PLANS;
}

/** PlanIds match dbo.Plans: 22 Free, 20 Starter, 21 Pro, 23 Scale */
export const PUBLISH_PLAN_PLATFORMS: Record<number, PublishPlatform[]> = {
  22: ["Facebook"],
  20: ["X", "Facebook"],
  21: ["X", "Facebook"],
  23: ["Facebook", "X", "LinkedIn"],
};

export function socialPlatformToPublishPlatform(platform: SocialPlatform): PublishPlatform {
  if (platform === "x") return "X";
  if (platform === "facebook") return "Facebook";
  return "LinkedIn";
}

export function isPlatformAllowedForPlan(
  planId: number | null | undefined,
  platform: SocialPlatform,
): boolean {
  const resolvedPlanId = planId ?? 22;
  const allowed = PUBLISH_PLAN_PLATFORMS[resolvedPlanId] ?? PUBLISH_PLAN_PLATFORMS[22];
  return allowed.includes(socialPlatformToPublishPlatform(platform));
}

export function buildPlatformNotAllowedMessage(platform: SocialPlatform): string {
  const name = socialPlatformToPublishPlatform(platform);
  return `${name} is not included on your current plan. Upgrade your plan to schedule on ${name}.`;
}

export function getPublishPlanName(planId: number | null | undefined): string {
  const resolvedPlanId = planId ?? 22;
  if (resolvedPlanId === 22) return BASE_PLANS[0].name;
  return BASE_PLANS.find((plan) => plan.stripePlanId === resolvedPlanId)?.name ?? BASE_PLANS[0].name;
}

export type PlanPlatformInclusion = {
  platform: PublishPlatform;
  included: boolean;
};

export function getPlanPlatformInclusion(
  planId: number | null | undefined,
  allowedPlatforms?: string[],
): PlanPlatformInclusion[] {
  const allowed = new Set(
    allowedPlatforms?.length
      ? allowedPlatforms
      : PUBLISH_PLAN_PLATFORMS[planId ?? 22] ?? PUBLISH_PLAN_PLATFORMS[22],
  );
  return PUBLISH_PLATFORM_DISPLAY_ORDER.map((platform) => ({
    platform,
    included: allowed.has(platform),
  }));
}