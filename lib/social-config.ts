import type { SocialPlatform } from "./types";

const ALL_PLATFORMS: SocialPlatform[] = ["x", "facebook", "linkedin"];

function parseEnabledPlatforms(raw: string | undefined): SocialPlatform[] {
  const source = (raw ?? "facebook").trim();
  if (!source) return ["facebook"];

  const requested = source
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is SocialPlatform => ALL_PLATFORMS.includes(item as SocialPlatform));

  return requested.length > 0 ? requested : ["facebook"];
}

const ENABLED_PLATFORMS = parseEnabledPlatforms(process.env.NEXT_PUBLIC_ENABLED_SOCIALS);

export function getEnabledSocialPlatforms(): SocialPlatform[] {
  return ENABLED_PLATFORMS;
}

export function isSocialPlatformEnabled(platform: SocialPlatform): boolean {
  return ENABLED_PLATFORMS.includes(platform);
}
