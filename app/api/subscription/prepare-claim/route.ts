import { NextResponse } from "next/server";
import { CLAIM_COOKIE_NAME } from "../../../../lib/constants";
import { getClipostsApiBaseUrl } from "../../../../lib/cliposts-api";

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const prepResponse = await fetch(`${getClipostsApiBaseUrl()}/api/subscription/prepare-claim`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
      cache: "no-store",
    });

    if (!prepResponse.ok) {
      const text = await prepResponse.text();
      return NextResponse.json(
        { error: `Failed to prepare subscription claim: ${text || prepResponse.statusText}` },
        { status: prepResponse.status === 404 ? 501 : 502 },
      );
    }

    const prepData = (await prepResponse.json()) as {
      claimToken?: string;
      mode?: string;
      emailHint?: string | null;
    };

    if (!prepData.claimToken) {
      return NextResponse.json({ error: "No claim token returned from API." }, { status: 400 });
    }

    const response = NextResponse.json({
      ok: true,
      mode: prepData.mode ?? "guest",
      emailHint: prepData.emailHint ?? null,
    });

    response.cookies.set(CLAIM_COOKIE_NAME, prepData.claimToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return response;
  } catch (error) {
    console.error("Error preparing subscription claim:", error);
    return NextResponse.json({ error: "Failed to prepare subscription claim." }, { status: 500 });
  }
}
