"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { generateCampaign, getPublishQuota, listConnections, PublishQuotaStatus, schedulePosts, SIGN_IN_URL, SIGN_UP_URL } from "../lib/api";
import { runPlatformConnect, runPlatformDisconnect } from "../lib/connect-oauth";
import { usePublishRouter } from "../lib/use-publish-router";
import { withMountPath } from "../lib/mount-path";
import {
  buildPlatformNotAllowedMessage,
  getPlanPlatformInclusion,
  getPublishPlanName,
  isPlatformAllowedForPlan,
  socialPlatformToPublishPlatform,
} from "../lib/publish-plans";
import {
  loadAuth,
  loadCampaign,
  loadConnections,
  saveAuth,
  saveCampaign,
  saveConnections,
} from "../lib/campaign-store";
import {
  CampaignSeed,
  GeneratedCampaign,
  GeneratedPost,
  ScheduleRequest,
  SocialConnection,
  SocialPlatform,
} from "../lib/types";
import { SiteHeader } from "./site-header";

type PendingGuardedAction = {
  type: "connect" | "schedule-selected" | "schedule-all";
  platform?: SocialPlatform;
};

type SchedulePlan = {
  kind: "schedule-selected" | "schedule-all";
  postIds: string[];
};

const PLATFORM_OPTIONS: Array<{ value: SocialPlatform; label: string }> = [
  { value: "x", label: "X" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

const DEFAULT_CONNECTIONS: SocialConnection[] = PLATFORM_OPTIONS.map((option) => ({
  platform: option.value,
  status: "disconnected",
}));

function platformTitle(platform: SocialPlatform) {
  if (platform === "x") return "X";
  return platform[0].toUpperCase() + platform.slice(1);
}

function isSchedulingAllowedForPlatform(
  quota: PublishQuotaStatus | null,
  targetPlatform: SocialPlatform,
): boolean {
  if (quota?.allowedPlatforms.length) {
    return quota.allowedPlatforms.includes(socialPlatformToPublishPlatform(targetPlatform));
  }
  return isPlatformAllowedForPlan(quota?.planId ?? 22, targetPlatform);
}

export function CampaignClient() {
  const router = usePublishRouter();
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [campaign, setCampaign] = useState<GeneratedCampaign | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>(DEFAULT_CONNECTIONS);
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");

  const [isHydrating, setIsHydrating] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyConnection, setBusyConnection] = useState<SocialPlatform | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [awaitingSignIn, setAwaitingSignIn] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPostLimitModal, setShowPostLimitModal] = useState(false);
  const [postLimitMessage, setPostLimitMessage] = useState<string | null>(null);
  const [showConnectionErrorModal, setShowConnectionErrorModal] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | null>(null);
  const [showPlatformLimitModal, setShowPlatformLimitModal] = useState(false);
  const [platformLimitMessage, setPlatformLimitMessage] = useState<string | null>(null);
  const [publishQuota, setPublishQuota] = useState<PublishQuotaStatus | null>(null);
  const [pendingSchedulePlan, setPendingSchedulePlan] = useState<SchedulePlan | null>(null);
  const [scheduleAtInput, setScheduleAtInput] = useState("");
  const [pendingGuardedAction, setPendingGuardedAction] = useState<PendingGuardedAction | null>(null);
  const [pendingScheduleAfterConnect, setPendingScheduleAfterConnect] = useState<
    "schedule-selected" | "schedule-all" | null
  >(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coreIdeaParam = searchParams.get("coreIdea") ?? searchParams.get("seed") ?? "";
  const platformParam = searchParams.get("platform") ?? "";
  const metadataRaw = searchParams.get("metadata") ?? "";

  useEffect(() => {
    const authed = loadAuth();
    setIsAuthenticated(authed);
    const savedConnections = loadConnections();
    if (savedConnections?.length) setConnections(savedConnections);

    const saved = loadCampaign();
    if (saved) {
      setCampaign(saved);
      setPlatform(saved.seed.platform);
      setIsHydrating(false);
      return;
    }

    const coreIdea = coreIdeaParam.trim();

    if (!coreIdea) {
      setIsHydrating(false);
      return;
    }

    let metadata: Record<string, string> | undefined;
    if (metadataRaw) {
      try {
        metadata = JSON.parse(metadataRaw) as Record<string, string>;
      } catch {
        metadata = { source: metadataRaw };
      }
    }

    const safePlatform =
      platformParam && PLATFORM_OPTIONS.some((item) => item.value === platformParam)
        ? (platformParam as SocialPlatform)
        : "linkedin";

    const seed: CampaignSeed = {
      id: `seed_${Date.now()}`,
      coreIdea: coreIdea.trim(),
      platform: safePlatform,
      metadata,
      createdAt: new Date().toISOString(),
    };

    setIsGenerating(true);
    void generateCampaign(seed).then((result) => {
      setIsGenerating(false);
      setIsHydrating(false);
      if (!result.ok || !result.data) {
        setError(result.error ?? "Could not generate campaign from handoff payload.");
        return;
      }
      setCampaign(result.data);
      setPlatform(seed.platform);
      saveCampaign(result.data);
      setNotice("Campaign created from Cliposts handoff payload.");
      router.replace("/campaign");
    });
  }, [coreIdeaParam, metadataRaw, platformParam, router]);

  useEffect(() => {
    void listConnections(isAuthenticated).then((result) => {
      if (result.ok && result.data?.length) {
        setConnections(result.data);
      }
    });
    if (!isAuthenticated) {
      setPublishQuota(null);
      return;
    }
    void getPublishQuota(isAuthenticated).then((result) => {
      if (result.ok && result.data) {
        setPublishQuota(result.data);
      }
    });
  }, [isAuthenticated]);

  useEffect(() => {
    saveAuth(isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    saveConnections(connections);
  }, [connections]);

  useEffect(() => {
    saveCampaign(campaign);
  }, [campaign]);

  const selectedCount = campaign?.posts.filter((post) => post.selected).length ?? 0;
  const totalCount = campaign?.posts.length ?? 0;
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const selectedPlatformConnection = connections.find((item) => item.platform === platform);
  const isSelectedPlatformConnected = selectedPlatformConnection?.status === "connected";
  const isSelectedPlatformOnPlan = isSchedulingAllowedForPlatform(publishQuota, platform);
  const planPlatformInclusion = getPlanPlatformInclusion(
    publishQuota?.planId,
    publishQuota?.allowedPlatforms,
  );

  function openPlatformLimitModal(message?: string) {
    setPlatformLimitMessage(message ?? buildPlatformNotAllowedMessage(platform));
    setShowPlatformLimitModal(true);
  }

  const upsertConnection = useCallback((next: SocialConnection) => {
    setConnections((prev) => prev.map((item) => (item.platform === next.platform ? next : item)));
  }, []);

  const guardedAction = useCallback(
    async (action: PendingGuardedAction, cb: () => Promise<void>) => {
      if (isAuthenticated) {
        await cb();
        return;
      }
      setPendingGuardedAction(action);
      setAwaitingSignIn(false);
      setShowAuthPrompt(true);
    },
    [isAuthenticated],
  );

  const pendingGuardedActionRef = useRef<PendingGuardedAction | null>(null);
  const pendingScheduleAfterConnectRef = useRef<"schedule-selected" | "schedule-all" | null>(null);
  const showAuthPromptRef = useRef(false);
  const resumeAfterAuthRef = useRef<(() => Promise<void>) | null>(null);
  pendingGuardedActionRef.current = pendingGuardedAction;
  pendingScheduleAfterConnectRef.current = pendingScheduleAfterConnect;
  showAuthPromptRef.current = showAuthPrompt;

  function handleSignIn() {
    setAwaitingSignIn(true);
    window.open(SIGN_IN_URL, "_blank", "noopener,noreferrer");
  }

  function openConnectionErrorModal(message: string) {
    setConnectionErrorMessage(message);
    setShowConnectionErrorModal(true);
  }

  async function handleConnect(targetPlatform: SocialPlatform): Promise<{ success: boolean; message?: string }> {
    setBusyConnection(targetPlatform);
    setError(null);
    const existing = connections.find((item) => item.platform === targetPlatform);
    if (!existing) {
      setBusyConnection(null);
      return { success: false, message: "Connection failed." };
    }

    upsertConnection({ ...existing, status: "connecting", lastError: undefined });
    setNotice("Complete login and page selection in the popup. This page updates when the connection is ready.");
    const connected = await runPlatformConnect(existing.platform, true);
    if (!connected.ok || !connected.data) {
      const message = connected.error ?? "Could not connect account.";
      upsertConnection({
        ...existing,
        status: "error",
        lastError: message,
      });
      setError(message);
      setBusyConnection(null);
      return { success: false, message };
    }

    upsertConnection(connected.data);
    if (connected.data.status === "connected") {
      setNotice(`${platformTitle(targetPlatform)} connected.`);
      setBusyConnection(null);
      return { success: true };
    }

    const message =
      connected.data.lastError ??
      (connected.data.status === "error"
        ? "Could not start social connection. Check Postiz integration settings."
        : "Connect flow did not complete.");
    setError(message);
    setBusyConnection(null);
    return { success: false, message };
  }

  async function continuePendingScheduleAfterConnect() {
    const kind = pendingScheduleAfterConnectRef.current;
    if (!kind) return;
    setPendingScheduleAfterConnect(null);
    if (kind === "schedule-selected") {
      await handleScheduleSelected();
      return;
    }
    if (kind === "schedule-all") {
      await handleScheduleAll();
    }
  }

  async function handleDisconnect(targetPlatform: SocialPlatform) {
    setIsDisconnecting(true);
    setError(null);
    const existing = connections.find((item) => item.platform === targetPlatform);
    if (!existing) {
      setIsDisconnecting(false);
      return;
    }

    const result = await runPlatformDisconnect(targetPlatform, true);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Could not disconnect account.");
      setIsDisconnecting(false);
      return;
    }

    upsertConnection(result.data);
    setNotice(`${platformTitle(targetPlatform)} disconnected.`);
    setIsDisconnecting(false);
  }

  function updatePost(postId: string, updater: (current: GeneratedPost) => GeneratedPost) {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((post) => (post.id === postId ? updater(post) : post)),
      };
    });
  }

  function togglePostSelection(postId: string) {
    updatePost(postId, (post) => ({ ...post, selected: !post.selected }));
  }

  function setAllPostsSelected(selected: boolean) {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((post) => ({ ...post, selected })),
      };
    });
  }

  function deletePost(postId: string) {
    setCampaign((prev) => {
      if (!prev) return prev;
      return { ...prev, posts: prev.posts.filter((post) => post.id !== postId) };
    });
  }

  function toLocalDateTimeInput(date: Date) {
    const pad = (value: number) => `${value}`.padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  }

  function openScheduleModal(kind: "schedule-selected" | "schedule-all", postIds: string[]) {
    const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
    setPendingSchedulePlan({ kind, postIds });
    setScheduleAtInput(toLocalDateTimeInput(defaultDate));
    setShowScheduleModal(true);
  }

  async function schedule(postIds: string[], scheduleAtISO?: string) {
    if (!campaign) return;
    const orderedPosts = campaign.posts
      .filter((post) => postIds.includes(post.id))
      .sort((a, b) => a.day - b.day);
    if (orderedPosts.length === 0) return;

    const startAt = scheduleAtISO ? new Date(scheduleAtISO) : new Date(Date.now() + 60 * 60 * 1000);
    if (Number.isNaN(startAt.getTime())) {
      setError("Invalid schedule time.");
      return;
    }

    setIsScheduling(true);
    setError(null);

    let firstAtISO: string | null = null;
    for (let index = 0; index < orderedPosts.length; index += 1) {
      const post = orderedPosts[index];
      const dailyAt = new Date(startAt);
      dailyAt.setDate(startAt.getDate() + index);

      const request: ScheduleRequest = {
        campaignId: campaign.id,
        postIds: [post.id],
        platform,
        scheduleAtISO: dailyAt.toISOString(),
      };
      const result = await schedulePosts(request, campaign, isAuthenticated);
      if (!result.ok || !result.data) {
        setIsScheduling(false);
        if (result.code === "POST_LIMIT_REACHED") {
          setPostLimitMessage(
            result.error ??
              "You have used all posts included in your plan for this month. Upgrade your plan or schedule fewer posts.",
          );
          setShowPostLimitModal(true);
        } else if (result.code === "PLATFORM_NOT_ON_PLAN") {
          openPlatformLimitModal(result.error);
        } else {
          setError(result.error ?? "Could not schedule posts.");
        }
        return;
      }
      if (!firstAtISO) firstAtISO = result.data.atISO;
    }

    setIsScheduling(false);
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((post) =>
          postIds.includes(post.id)
            ? {
                ...post,
                status: "scheduled",
                scheduledFor: post.scheduledFor ?? startAt.toISOString(),
              }
            : post,
        ),
      };
    });
    router.push(
      `/campaign/confirmation?count=${encodeURIComponent(
        String(postIds.length),
      )}&platform=${encodeURIComponent(platform)}&at=${encodeURIComponent(firstAtISO ?? startAt.toISOString())}`,
    );
  }

  async function handleScheduleSelected() {
    if (!campaign) return;
    const ids = campaign.posts.filter((post) => post.selected).map((post) => post.id);
    openScheduleModal("schedule-selected", ids);
  }

  async function handleScheduleAll() {
    if (!campaign) return;
    const ids = campaign.posts.map((post) => post.id);
    openScheduleModal("schedule-all", ids);
  }

  async function confirmSchedule() {
    if (!pendingSchedulePlan) return;
    if (!scheduleAtInput) {
      setError("Please choose date and time.");
      return;
    }

    const scheduleAtISO = new Date(scheduleAtInput).toISOString();
    setShowScheduleModal(false);
    await schedule(pendingSchedulePlan.postIds, scheduleAtISO);
    setPendingSchedulePlan(null);
  }

  function requestSchedule(kind: "schedule-selected" | "schedule-all") {
    if (isAuthenticated && !isSelectedPlatformOnPlan) {
      openPlatformLimitModal();
      return;
    }

    if (!isSelectedPlatformConnected) {
      setPendingScheduleAfterConnect(kind);
      setShowConnectPrompt(true);
      return;
    }

    if (kind === "schedule-selected") {
      void guardedAction({ type: "schedule-selected" }, async () => {
        await handleScheduleSelected();
      });
      return;
    }

    void guardedAction({ type: "schedule-all" }, async () => {
      await handleScheduleAll();
    });
  }

  async function handleConnectFromPrompt() {
    setShowConnectPrompt(false);
    if (!isAuthenticated) {
      setPendingGuardedAction({ type: "connect", platform });
      setAwaitingSignIn(false);
      setShowAuthPrompt(true);
      return;
    }

    const result = await handleConnect(platform);
    if (!result.success) {
      setPendingScheduleAfterConnect(null);
      openConnectionErrorModal(result.message ?? "Could not connect account.");
      return;
    }

    await continuePendingScheduleAfterConnect();
  }

  resumeAfterAuthRef.current = async () => {
    const action = pendingGuardedActionRef.current;
    if (!action) return;

    if (action.type === "connect" && action.platform) {
      const result = await handleConnect(action.platform);
      if (!result.success) {
        setPendingScheduleAfterConnect(null);
        openConnectionErrorModal(result.message ?? "Could not connect account.");
        return;
      }
      await continuePendingScheduleAfterConnect();
      return;
    }

    if (action.type === "schedule-selected") {
      await handleScheduleSelected();
      return;
    }

    if (action.type === "schedule-all") {
      await handleScheduleAll();
    }
  };

  useEffect(() => {
    const checkAuthAndResume = () => {
      if (!loadAuth()) return;

      setIsAuthenticated(true);
      if (!showAuthPromptRef.current || !pendingGuardedActionRef.current) return;

      setShowAuthPrompt(false);
      setAwaitingSignIn(false);
      setPendingGuardedAction(null);
      setNotice("Signed in. Continuing where you left off.");
      void resumeAfterAuthRef.current?.();
    };

    window.addEventListener("focus", checkAuthAndResume);
    document.addEventListener("visibilitychange", checkAuthAndResume);
    return () => {
      window.removeEventListener("focus", checkAuthAndResume);
      document.removeEventListener("visibilitychange", checkAuthAndResume);
    };
  }, []);

  const hasCampaign = !!campaign && campaign.posts.length > 0;

  return (
    <main>
      <SiteHeader />

      <section className="hero section-shell hero-compact">
        <span className="label">Campaign</span>
        <h1>Day 1 to Day 14 campaign editor</h1>
        <p className="hero-copy">
          Edit posts, connect a platform, and schedule selected or all in one flow.
        </p>
      </section>

      {isHydrating || isGenerating ? (
        <section className="section-shell panel">
          <p className="note">Preparing your campaign...</p>
        </section>
      ) : !hasCampaign ? (
        <section className="section-shell panel">
          <div className="empty-state">
            <p>No campaign is loaded yet. Generate one from the home page.</p>
            <Link className="button button-primary" href={withMountPath("/")}>
              Go to generator
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="section-shell panel">
            <div className="panel-header campaign-header">
              <div>
                <h2>Your posts</h2>
                <p className="note">
                  {platformTitle(platform)}:{" "}
                  {isSelectedPlatformConnected
                    ? selectedPlatformConnection?.accountName
                      ? `Connected as ${selectedPlatformConnection.accountName}`
                      : "Connected"
                    : "Not connected"}
                  {isAuthenticated && !isSelectedPlatformOnPlan
                    ? ` · Not included on your plan`
                    : null}
                </p>
              </div>
              <div className="campaign-header-actions">
                {isSelectedPlatformConnected ? (
                  <button
                    className="button button-secondary danger"
                    type="button"
                    onClick={() => void handleDisconnect(platform)}
                    disabled={isDisconnecting || busyConnection === platform}
                  >
                    {isDisconnecting ? "Disconnecting..." : `Disconnect ${platformTitle(platform)}`}
                  </button>
                ) : (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => void handleConnect(platform)}
                    disabled={busyConnection === platform || isDisconnecting}
                  >
                    {busyConnection === platform ? "Connecting..." : `Connect ${platformTitle(platform)}`}
                  </button>
                )}
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => requestSchedule("schedule-selected")}
                  disabled={isScheduling || selectedCount === 0}
                >
                  {isScheduling ? "Scheduling..." : "Schedule selected"}
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => requestSchedule("schedule-all")}
                  disabled={isScheduling || !campaign}
                >
                  {isScheduling ? "Scheduling..." : "Schedule all"}
                </button>
              </div>
            </div>

            {(notice || error) && (
              <div className="campaign-flash">
                {notice && <p className="flash flash-success">{notice}</p>}
                {error && <p className="flash flash-error">{error}</p>}
              </div>
            )}

            <div className="bulk-actions">
              <button
                className="button button-secondary button-compact"
                type="button"
                onClick={() => setAllPostsSelected(true)}
                disabled={allSelected}
              >
                Select all
              </button>
              <button
                className="button button-secondary button-compact"
                type="button"
                onClick={() => setAllPostsSelected(false)}
                disabled={selectedCount === 0}
              >
                Deselect all
              </button>
              <span>
                {selectedCount} of {totalCount} selected
              </span>
            </div>

            <div className="posts-grid">
              {campaign?.posts.map((post) => (
                <article className="post-card" key={post.id}>
                  <header className="post-card-header">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={post.selected}
                        onChange={() => togglePostSelection(post.id)}
                      />
                      <span className="checkbox-indicator" aria-hidden="true" />
                      <span className="checkbox-label">Day {post.day}</span>
                    </label>
                    <span className={`status status-${post.status}`}>
                      {post.status === "scheduled" && post.scheduledFor
                        ? `Scheduled ${new Date(post.scheduledFor).toLocaleDateString()}`
                        : post.status}
                    </span>
                  </header>
                  <textarea
                    value={post.text}
                    onChange={(event) =>
                      updatePost(post.id, (current) => ({ ...current, text: event.target.value }))
                    }
                  />
                  <div className="post-actions">
                    <button
                      className="button button-secondary danger"
                      type="button"
                      onClick={() => deletePost(post.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {showPlatformLimitModal && (
        <div className="modal-backdrop" onClick={() => setShowPlatformLimitModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Channel not on your plan</h3>
            <p>
              {platformLimitMessage ??
                buildPlatformNotAllowedMessage(platform)}
            </p>
            <div className="plan-inclusion-panel">
              <p className="plan-inclusion-heading">
                Your plan
                <strong>{getPublishPlanName(publishQuota?.planId)}</strong>
              </p>
              <ul className="plan-inclusion-list" aria-label="Scheduling channels on your plan">
                {planPlatformInclusion.map((item) => (
                  <li
                    key={item.platform}
                    className={`plan-inclusion-item ${item.included ? "is-included" : "is-excluded"}`}
                  >
                    <span className="plan-inclusion-platform">{item.platform}</span>
                    <span
                      className={`plan-inclusion-pill ${item.included ? "is-yes" : "is-no"}`}
                    >
                      <span className="plan-inclusion-mark" aria-hidden="true">
                        {item.included ? "✓" : "✕"}
                      </span>
                      {item.included ? "Included" : "Not included"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-actions modal-actions-inline">
              <Link className="button button-primary" href={withMountPath("/#pricing")}>
                View plans
              </Link>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowPlatformLimitModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showConnectionErrorModal && (
        <div className="modal-backdrop" onClick={() => setShowConnectionErrorModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Connection failed</h3>
            <p>{connectionErrorMessage ?? "Could not connect account. Please try again."}</p>
            <div className="modal-actions modal-actions-inline">
              <button
                className="button button-primary"
                type="button"
                onClick={() => setShowConnectionErrorModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostLimitModal && (
        <div className="modal-backdrop" onClick={() => setShowPostLimitModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Post limit reached</h3>
            <p>
              {postLimitMessage ??
                "You have used all posts included in your plan for this month. Upgrade your plan or schedule fewer posts."}
            </p>
            <div className="modal-actions modal-actions-inline">
              <Link className="button button-primary" href={withMountPath("/#pricing")}>
                View plans
              </Link>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowPostLimitModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showConnectPrompt && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowConnectPrompt(false);
            setPendingScheduleAfterConnect(null);
          }}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Connect {platformTitle(platform)} to schedule</h3>
            <p>
              {isSelectedPlatformConnected
                ? `${platformTitle(platform)} is connected. You can disconnect or continue scheduling.`
                : `Scheduling needs a connected ${platformTitle(platform)} account. Connect now and continue automatically.`}
            </p>
            <div className="modal-actions">
              {isSelectedPlatformConnected ? (
                <button
                  className="button button-secondary danger"
                  type="button"
                  onClick={() => void handleDisconnect(platform)}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? "Disconnecting..." : `Disconnect ${platformTitle(platform)}`}
                </button>
              ) : (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void handleConnectFromPrompt()}
                  disabled={busyConnection === platform}
                >
                  {busyConnection === platform ? "Connecting..." : `Connect ${platformTitle(platform)}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowScheduleModal(false);
            setPendingSchedulePlan(null);
          }}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Schedule posts</h3>
            <p>Select publish date and time, then confirm scheduling.</p>
            <label className="field">
              <span>Date &amp; time</span>
              <input
                type="datetime-local"
                value={scheduleAtInput}
                onChange={(event) => setScheduleAtInput(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button className="button button-primary" type="button" onClick={() => void confirmSchedule()}>
                Confirm schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthPrompt && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowAuthPrompt(false);
            setAwaitingSignIn(false);
            setPendingGuardedAction(null);
            setPendingScheduleAfterConnect(null);
          }}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Sign in required</h3>
            <p>
              {awaitingSignIn
                ? "Complete sign-in in the other tab, then return here. Scheduling will continue automatically once you are signed in."
                : "Guests can generate and edit campaigns. Connecting and scheduling require sign-in."}
            </p>
            <div className="modal-actions modal-actions-inline">
              <button className="button button-primary" onClick={handleSignIn} type="button">
                {awaitingSignIn ? "Open sign in again" : "Sign in"}
              </button>
              <a className="button button-secondary" href={SIGN_UP_URL} target="_blank" rel="noreferrer">
                Sign up
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
