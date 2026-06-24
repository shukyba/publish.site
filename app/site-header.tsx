"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SIGN_IN_URL } from "../lib/api";
import { clearAuthState, loadAuth } from "../lib/campaign-store";

const SIGN_OFF_URL = "https://iam.cliposts.com/sign-off";

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
        href="/"
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
        {!isAuthenticated ? <Link href="/#generator">Try it free</Link> : null}
        <Link href="/#pricing">Pricing</Link>
        <Link href="/#faq">FAQ</Link>
        <Link href="/scheduled-posts">Scheduled posts</Link>
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
