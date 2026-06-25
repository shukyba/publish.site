"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  cancelScheduledPost,
  cancelScheduledSchedule,
  listScheduledPosts,
  SIGN_IN_URL,
  SIGN_UP_URL,
} from "../../lib/api";
import { loadAuth } from "../../lib/campaign-store";
import { formatUtcLocal, parseUtcDate } from "../../lib/datetime";
import { withMountPath } from "../../lib/mount-path";
import { ScheduledPostItem } from "../../lib/types";
import { SiteHeader } from "../site-header";

type ScheduledBatch = {
  batchKey: string;
  index: number;
  items: ScheduledPostItem[];
  platform: ScheduledPostItem["platform"];
  title: string;
  subtitle: string;
  scheduleIds: string[];
};

function platformTitle(platform: ScheduledPostItem["platform"]) {
  if (platform === "x") return "X";
  return platform[0].toUpperCase() + platform.slice(1);
}

function readCoreIdea(messageText: string): string {
  const marker = "Core idea:";
  const idx = messageText.indexOf(marker);
  if (idx === -1) return messageText.slice(0, 80).trim();
  return messageText.slice(idx + marker.length).trim().slice(0, 120);
}

function readCoreIdeaKey(messageText: string): string {
  return readCoreIdea(messageText).toLowerCase();
}

function readTimeKey(iso?: string): string {
  const dt = parseUtcDate(iso);
  if (!dt) return "na";
  return `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
}

function formatDateRange(items: ScheduledPostItem[]): string {
  const times = items
    .map((item) => parseUtcDate(item.publishAtUtc)?.getTime() ?? NaN)
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);
  if (times.length === 0) return "Dates pending";
  const start = new Date(times[0]);
  const end = new Date(times[times.length - 1]);
  const startLabel = start.toLocaleDateString();
  const endLabel = end.toLocaleDateString();
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

export function ScheduledPostsClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ScheduledPostItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyBatchKey, setBusyBatchKey] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    const authed = loadAuth();
    setIsAuthenticated(authed);
    if (!authed) {
      setIsLoading(false);
      return;
    }

    void listScheduledPosts(true).then((result) => {
      setIsLoading(false);
      if (!result.ok || !result.data) {
        setError(result.error ?? "Could not load scheduled posts.");
        return;
      }
      setItems(result.data);
    });
  }, []);

  async function handleCancel(scheduleId: string, schedulePostId: string) {
    setBusyId(schedulePostId);
    setError(null);
    const result = await cancelScheduledPost(scheduleId, schedulePostId, true);
    setBusyId(null);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Could not cancel this schedule.");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.schedulePostId === schedulePostId ? { ...item, status: "canceled" } : item,
      ),
    );
  }

  async function handleDeleteBatch(batch: ScheduledBatch) {
    const confirmed = window.confirm(
      `Delete all ${batch.items.length} scheduled posts in this batch? This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyBatchKey(batch.batchKey);
    setError(null);

    for (const scheduleId of batch.scheduleIds) {
      const result = await cancelScheduledSchedule(scheduleId, true);
      if (!result.ok) {
        setBusyBatchKey(null);
        setError(result.error ?? "Could not delete this batch.");
        return;
      }
    }

    const batchPostIds = new Set(batch.items.map((item) => item.schedulePostId));
    setItems((prev) =>
      prev.map((item) => (batchPostIds.has(item.schedulePostId) ? { ...item, status: "canceled" } : item)),
    );
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      next.delete(batch.batchKey);
      return next;
    });
    setBusyBatchKey(null);
  }

  function toggleBatch(batchKey: string) {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchKey)) next.delete(batchKey);
      else next.add(batchKey);
      return next;
    });
  }

  const visibleItems = useMemo(() => items.filter((item) => item.status !== "canceled"), [items]);
  const batches = useMemo<ScheduledBatch[]>(() => {
    const sorted = [...visibleItems].sort((a, b) => {
      const ad = parseUtcDate(a.publishAtUtc)?.getTime() ?? 0;
      const bd = parseUtcDate(b.publishAtUtc)?.getTime() ?? 0;
      return bd - ad;
    });

    const map = new Map<string, ScheduledPostItem[]>();
    for (const item of sorted) {
      const coreIdeaKey = readCoreIdeaKey(item.messageText || "");
      const timeKey = readTimeKey(item.publishAtUtc);
      const key = `${item.platform}|${timeKey}|${coreIdeaKey}`;
      const current = map.get(key);
      if (current) current.push(item);
      else map.set(key, [item]);
    }

    return Array.from(map.entries()).map(([batchKey, batchItems], index) => {
      const itemsSorted = [...batchItems].sort((a, b) => {
        const ad = parseUtcDate(a.publishAtUtc)?.getTime() ?? 0;
        const bd = parseUtcDate(b.publishAtUtc)?.getTime() ?? 0;
        return ad - bd;
      });
      const first = itemsSorted[0];
      const coreIdea = readCoreIdea(first?.messageText || "");
      return {
        batchKey,
        index,
        items: itemsSorted,
        platform: first.platform,
        title: coreIdea || `${platformTitle(first.platform)} campaign`,
        subtitle: `${itemsSorted.length} ${itemsSorted.length === 1 ? "post" : "posts"} · ${formatDateRange(itemsSorted)}`,
        scheduleIds: [...new Set(itemsSorted.map((item) => item.scheduleId))],
      };
    });
  }, [visibleItems]);

  const hasItems = useMemo(() => visibleItems.length > 0, [visibleItems]);
  const listPlatformTitle = useMemo(() => {
    if (visibleItems.length === 0) return null;
    const first = visibleItems[0]?.platform;
    const singlePlatform = visibleItems.every((item) => item.platform === first);
    return singlePlatform ? platformTitle(first) : null;
  }, [visibleItems]);

  return (
    <main>
      <SiteHeader />

      <section className="hero section-shell hero-compact">
        <span className="label">Scheduled posts</span>
        <h1>Manage upcoming scheduled posts</h1>
        <p className="hero-copy">Review campaign batches, expand to edit individual posts, or delete a whole batch.</p>
      </section>

      {!isAuthenticated ? (
        <section className="section-shell panel">
          <div className="panel-header">
            <h2>Sign in required</h2>
            <p>Scheduled posts are available only for signed-in users.</p>
          </div>
          <div className="hero-cta">
            <a className="button button-primary" href={SIGN_IN_URL}>
              Sign in
            </a>
            <a className="button button-secondary" href={SIGN_UP_URL}>
              Sign up
            </a>
          </div>
        </section>
      ) : isLoading ? (
        <section className="section-shell panel">
          <p className="note">Loading scheduled posts...</p>
        </section>
      ) : !hasItems ? (
        <section className="section-shell panel">
          <div className="empty-state">
            <p>No scheduled posts yet.</p>
            <Link className="button button-primary" href={withMountPath("/#generator")}>
              Generate post plan
            </Link>
          </div>
        </section>
      ) : (
        <section className="section-shell panel">
          {listPlatformTitle ? <h2>{listPlatformTitle} scheduled posts</h2> : <h2>Scheduled posts</h2>}
          <div className="scheduled-batches">
            {batches.map((batch) => {
              const isExpanded = expandedBatches.has(batch.batchKey);
              const isBatchBusy = busyBatchKey === batch.batchKey;

              return (
                <section
                  className={`scheduled-batch ${isExpanded ? "scheduled-batch-expanded" : "scheduled-batch-collapsed"}`}
                  key={batch.batchKey}
                >
                  <div className="scheduled-batch-header">
                    <button
                      className="scheduled-batch-toggle"
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleBatch(batch.batchKey)}
                    >
                      <span className="scheduled-batch-chevron" aria-hidden="true">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                      <span className="scheduled-batch-summary">
                        <span className="scheduled-batch-title">{batch.title}</span>
                        <span className="scheduled-batch-meta">
                          {platformTitle(batch.platform)} · {batch.subtitle}
                        </span>
                      </span>
                    </button>
                    {!isExpanded ? (
                      <button
                        className="button button-secondary danger button-compact"
                        type="button"
                        disabled={isBatchBusy}
                        onClick={() => void handleDeleteBatch(batch)}
                      >
                        {isBatchBusy ? "Deleting..." : "Delete batch"}
                      </button>
                    ) : null}
                  </div>
                  {isExpanded ? (
                    <div className="scheduled-list">
                      {batch.items.map((item) => (
                        <article
                          className="scheduled-card"
                          key={`${item.scheduleId}-${item.schedulePostId || item.clientPostId || item.dayNumber || "post"}`}
                        >
                          <div className="scheduled-card-main">
                            <div className="scheduled-card-top">
                              <h3>{formatUtcLocal(item.publishAtUtc)}</h3>
                              <span className={`status status-${item.status}`}>{item.status}</span>
                            </div>
                            <p>{item.messageText || `Post ${item.dayNumber ?? ""}`}</p>
                          </div>
                          <div className="scheduled-card-actions">
                            <button
                              className="button button-secondary danger button-compact"
                              type="button"
                              disabled={item.status === "canceled" || busyId === item.schedulePostId}
                              onClick={() => void handleCancel(item.scheduleId, item.schedulePostId)}
                            >
                              {busyId === item.schedulePostId
                                ? "Canceling..."
                                : item.status === "canceled"
                                  ? "Canceled"
                                  : "Cancel"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </section>
      )}

      {error ? (
        <section className="section-shell">
          <p className="flash flash-error">{error}</p>
        </section>
      ) : null}
    </main>
  );
}
