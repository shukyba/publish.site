"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SIGN_IN_URL, SIGN_OFF_URL } from "../lib/api";
import { withMountPath } from "../lib/mount-path";
import { clearAuthState, loadAuth } from "../lib/campaign-store";

export function SiteHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const refresh = () => setIsAuthenticated(loadAuth());
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <nav className="nav">
      <Link
        className="brand brand-link"
        href={withMountPath("/")}
        aria-label="Cliposts Publish home"
        onClick={(event) => {
          if (pathname === "/") {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      >
        <span className="brand-mark">P</span>
        <span>Cliposts Publish</span>
      </Link>
      <div className="nav-links">
        {!isAuthenticated ? <Link href={withMountPath("/#generator")}>Try it free</Link> : null}
        <Link href={withMountPath("/#pricing")}>Pricing</Link>
        <Link href={withMountPath("/#faq")}>FAQ</Link>
        <Link href={withMountPath("/scheduled-posts")}>Scheduled posts</Link>
        {isAuthenticated ? (
          <a
            href={SIGN_OFF_URL}
            onClick={() => {
              clearAuthState();
              setIsAuthenticated(false);
            }}
          >
            Log out
          </a>
        ) : (
          <a href={SIGN_IN_URL}>Sign In</a>
        )}
      </div>
    </nav>
  );
}
