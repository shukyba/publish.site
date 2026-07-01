import { NextResponse } from "next/server";
import { CLAIM_COOKIE_NAME } from "../../../../lib/constants";
import { getClipostsApiBaseUrl } from "../../../../lib/cliposts-api";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const claimCookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${CLAIM_COOKIE_NAME}=`))
      ?.split("=")
      .slice(1)
      .join("=");

    if (!claimCookie) {
      return new NextResponse(null, { status: 204 });
    }

    const body = (await req.json().catch(() => ({}))) as { accountId?: string };
    const accountId =
      body.accountId ||
      cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("AccountId="))
        ?.split("=")
        .slice(1)
        .join("=");

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required to claim subscription." }, { status: 400 });
    }

    const claimResponse = await fetch(`${getClipostsApiBaseUrl()}/api/subscription/claim-pending`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountId,
        claimToken: decodeURIComponent(claimCookie),
      }),
      cache: "no-store",
    });

    if (!claimResponse.ok) {
      const text = await claimResponse.text();
      return NextResponse.json(
        { error: `Failed to claim subscription: ${text || claimResponse.statusText}` },
        { status: claimResponse.status === 404 ? 501 : 502 },
      );
    }

    const backendPayload = await claimResponse.json().catch(() => ({}));
    const response = NextResponse.json({ ok: true, ...backendPayload });
    response.cookies.set(CLAIM_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Error claiming pending subscription:", error);
    return NextResponse.json({ error: "Failed to claim pending subscription." }, { status: 500 });
  }
}
