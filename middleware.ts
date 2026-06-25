import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/publish").replace(/\/$/, "");

export function middleware(request: NextRequest) {
  if (!BASE_PATH) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = BASE_PATH;
  return NextResponse.redirect(url, 307);
}

// Run only for `/` so Azure SWA warm-up succeeds while the app lives under basePath.
export const config = {
  matcher: ["/"],
};
