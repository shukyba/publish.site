"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPublishQuota, SIGN_IN_URL, SIGN_OFF_URL } from "../lib/api";
import { withMountPath } from "../lib/mount-path";
import { clearAuthState, loadAuth } from "../lib/campaign-store";
import { getPublishPlanName } from "../lib/publish-plans";

type SiteHeaderProps = {
  showPlanLevel?: boolean;
};

export function SiteHeader({ showPlanLevel = false }: SiteHeaderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [planLevel, setPlanLevel] = useState<string | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
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

  useEffect(() => {
    let disposed = false;

    const refreshPlanLevel = async () => {
      if (!showPlanLevel || !isAuthenticated) {
        if (!disposed) {
          setPlanLevel(null);
          setIsPlanLoading(false);
        }
        return;
      }

      if (!disposed) setIsPlanLoading(true);
      const result = await getPublishQuota(true);
      if (disposed) return;

      if (result.ok && result.data) {
        setPlanLevel(getPublishPlanName(result.data.planId));
        setIsPlanLoading(false);
        return;
      }

      setPlanLevel(getPublishPlanName(undefined));
      setIsPlanLoading(false);
    };

    void refreshPlanLevel();
    const onRefresh = () => {
      void refreshPlanLevel();
    };

    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);

    return () => {
      disposed = true;
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [showPlanLevel, isAuthenticated]);

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
        {isAuthenticated && showPlanLevel ? (
          <span
            className="nav-chip nav-plan-chip"
            title={planLevel ? `Current plan: ${planLevel}` : "Current plan could not be loaded"}
          >
            Plan: {planLevel ?? (isPlanLoading ? "Loading..." : "Unavailable")}
          </span>
        ) : null}
        {isAuthenticated ? (
          <a
            href={SIGN_OFF_URL}
            onClick={() => {
              clearAuthState();
              setIsAuthenticated(false);
              setPlanLevel(null);
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
