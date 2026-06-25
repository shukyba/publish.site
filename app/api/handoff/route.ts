import { NextRequest, NextResponse } from "next/server";
import { withMountPath } from "../../../lib/mount-path";
import { SocialPlatform } from "../../../lib/types";

type HandoffRequest = {
  coreContent?: string;
  platform?: SocialPlatform;
  metadata?: Record<string, string>;
};

function safePlatform(value?: string): SocialPlatform {
  if (value === "x" || value === "facebook") return value;
  return "linkedin";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as HandoffRequest;
  if (!body.coreContent?.trim()) {
    return NextResponse.json(
      { ok: false, error: "coreContent is required for handoff." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    coreIdea: body.coreContent.trim(),
    platform: safePlatform(body.platform),
  });
  if (body.metadata) params.set("metadata", JSON.stringify(body.metadata));

  const handoffUrl = withMountPath(`/campaign?${params.toString()}`);
  return NextResponse.json({
    ok: true,
    handoffUrl,
    preview: "Mock handoff created. Redirect user to the handoffUrl in Publish.",
  });
}
