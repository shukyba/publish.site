export const PUBLISH_PLATFORMS = ["Facebook", "X", "LinkedIn"] as const;
export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];

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
    platforms: ["X"],
    description: "Try the full flow on X.",
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
