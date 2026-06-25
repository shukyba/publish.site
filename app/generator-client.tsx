"use client";

import { useEffect, useMemo, useState } from "react";
import { generateCampaign, listConnections, SIGN_IN_URL, SIGN_UP_URL } from "../lib/api";
import { refreshPlatformConnections, runPlatformConnect, runPlatformDisconnect } from "../lib/connect-oauth";
import { loadAuth, loadConnections, saveAuth, saveCampaign, saveConnections } from "../lib/campaign-store";
import { usePublishRouter } from "../lib/use-publish-router";
import { CampaignSeed, SocialConnection, SocialPlatform } from "../lib/types";

const PLATFORM_OPTIONS: Array<{
  value: SocialPlatform;
  label: string;
  tone: string;
  icon: string;
  description: string;
}> = [
  {
    value: "linkedin",
    label: "LinkedIn",
    tone: "Professional",
    icon: "in",
    description: "Best for thought leadership, B2B insights, and founder storytelling.",
  },
  {
    value: "x",
    label: "X",
    tone: "Concise",
    icon: "X",
    description: "Sharp hooks, quick takes, and momentum-building short-form posts.",
  },
  {
    value: "facebook",
    label: "Facebook",
    tone: "Conversational",
    icon: "f",
    description: "Longer explanatory posts with community-first conversation framing.",
  },
];

function getDefaultConnections(): SocialConnection[] {
  return PLATFORM_OPTIONS.map((option) => ({
    platform: option.value,
    status: "disconnected",
  }));
}

function normalizeConnections(saved: SocialConnection[] | null): SocialConnection[] {
  if (!saved || saved.length === 0) return getDefaultConnections();

  const byPlatform = new Map(saved.map((item) => [item.platform, item]));
  const merged: SocialConnection[] = PLATFORM_OPTIONS.map(
    (option) => byPlatform.get(option.value) ?? { platform: option.value, status: "disconnected" },
  );

  return merged;
}

export function GeneratorClient() {
  const router = usePublishRouter();
  const [coreIdea, setCoreIdea] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");
  const [isAuthenticated, setIsAuthenticated] = useState(() => loadAuth());
  const [connections, setConnections] = useState<SocialConnection[]>(() => normalizeConnections(loadConnections()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectNotice, setConnectNotice] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<SocialPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    void listConnections(isAuthenticated).then((result) => {
      if (result.ok && result.data) {
        setConnections(normalizeConnections(result.data));
      }
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showPlatformModal || !isAuthenticated) return;
    void refreshPlatformConnections(isAuthenticated).then((result) => {
      if (result.ok && result.data) {
        setConnections(normalizeConnections(result.data));
      }
    });
  }, [showPlatformModal, isAuthenticated]);

  const selectedConnection = useMemo(
    () => connections.find((item) => item.platform === platform),
    [connections, platform],
  );

  function upsertConnection(next: SocialConnection) {
    setConnections((prev) => {
      const updated = prev.map((item) => (item.platform === next.platform ? next : item));
      saveConnections(updated);
      return updated;
    });
  }

  function platformTitle(value: SocialPlatform) {
    if (value === "x") return "X";
    return value[0].toUpperCase() + value.slice(1);
  }

  async function runGenerate() {
    setIsGenerating(true);
    setError(null);
    const seed: CampaignSeed = {
      id: `seed_${Date.now()}`,
      coreIdea: coreIdea.trim(),
      platform,
      createdAt: new Date().toISOString(),
      metadata: {
        source: "publish-home",
      },
    };
    const result = await generateCampaign(seed);
    setIsGenerating(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Could not generate campaign.");
      return;
    }
    saveCampaign(result.data);
    router.push("/campaign");
  }

  function handleGenerateClick() {
    setError(null);
    setModalError(null);
    if (!coreIdea.trim()) {
      setError("Add a core idea first.");
      return;
    }
    setShowPlatformModal(true);
  }

  function connectionStatusLabel(connection: SocialConnection | undefined) {
    if (!connection || connection.status === "disconnected") return "Not connected";
    if (connection.status === "connecting") return "Connecting...";
    if (connection.status === "error") return "Connection error";
    if (connection.accountName) return `Connected as ${connection.accountName}`;
    return "Connected";
  }

  async function handleConnectSelectedPlatform() {
    if (!selectedConnection) return;
    setModalError(null);
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setIsConnecting(true);
    setConnectNotice(
      "Complete login and page selection in the popup. This window updates when the connection is ready.",
    );
    const result = await runPlatformConnect(selectedConnection.platform, true);
    setIsConnecting(false);
    setConnectNotice(null);
    if (!result.ok || !result.data) {
      const message = result.error ?? "Could not connect account.";
      setError(message);
      setModalError(message);
      return;
    }
    upsertConnection(result.data);
    if (result.data.status === "error") {
      const message =
        result.data.lastError ?? "Could not start social connection. Check Postiz integration settings.";
      setError(message);
      setModalError(message);
      return;
    }
    if (result.data.status !== "connected") {
      const message = result.data.lastError ?? "Connect flow did not complete.";
      setError(message);
      setModalError(message);
      return;
    }
    setError(null);
    setModalError(null);
  }

  async function handleDisconnectPlatform(targetPlatform: SocialPlatform) {
    setModalError(null);
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setDisconnectingPlatform(targetPlatform);
    const result = await runPlatformDisconnect(targetPlatform, true);
    setDisconnectingPlatform(null);
    if (!result.ok || !result.data) {
      const message = result.error ?? "Could not disconnect account.";
      setError(message);
      setModalError(message);
      return;
    }
    upsertConnection(result.data);
    setError(null);
    setModalError(null);
  }

  function handleSignIn() {
    setIsAuthenticated(true);
    saveAuth(true);
    setShowAuthPrompt(false);
    window.open(SIGN_IN_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <section className="section-shell panel" id="generator">
        <div className="panel-header">
          <span className="label">Generator</span>
          <h2>Start with one core idea</h2>
          <p>
            Share your core idea, choose a platform, and Publish will generate Day 1 through Day 14
            follow-up posts.
          </p>
        </div>
        <div className="generator-grid">
          <label className="field generator-grid-single">
            <span>Core idea</span>
            <textarea
              value={coreIdea}
              onChange={(event) => setCoreIdea(event.target.value)}
              placeholder="Example: We helped founders repurpose product webinars into an educational LinkedIn series."
            />
          </label>
        </div>
        <div className="generator-actions">
          <button
            className="button button-primary"
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateClick}
          >
            {isGenerating ? "Generating 14 posts..." : "Generate campaign"}
          </button>
          
        </div>
        {error && <p className="flash flash-error">{error}</p>}
      </section>

      {showPlatformModal && (
        <div className="modal-backdrop" onClick={() => setShowPlatformModal(false)}>
          <div className="modal modal-platform" onClick={(event) => event.stopPropagation()}>
            <h3>Select platform</h3>
            <p>Choose where to start this 14-day campaign.</p>
            <div className="platform-modal-list">
              {PLATFORM_OPTIONS.map((option) => {
                const optionConnection = connections.find((item) => item.platform === option.value);
                const isOptionConnected = optionConnection?.status === "connected";

                return (
                  <div
                    key={option.value}
                    className={`platform-option ${platform === option.value ? "platform-option-active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPlatform(option.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPlatform(option.value);
                      }
                    }}
                  >
                    <div className="platform-option-main">
                      <span className="platform-option-icon" aria-hidden="true">
                        {option.icon}
                      </span>
                      <div className="platform-option-copy">
                        <strong>{option.label}</strong>
                        <span className="platform-option-tone">{option.tone}</span>
                        <p>{option.description}</p>
                      </div>
                    </div>
                    <div className="platform-option-meta">
                      <span
                        className={`platform-option-status ${
                          isOptionConnected ? "platform-option-status-connected" : ""
                        }`}
                      >
                        {connectionStatusLabel(optionConnection)}
                      </span>
                      {isOptionConnected ? (
                        <button
                          className="button button-secondary danger button-compact"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDisconnectPlatform(option.value);
                          }}
                          disabled={disconnectingPlatform === option.value || isConnecting}
                        >
                          {disconnectingPlatform === option.value ? "Disconnecting..." : "Disconnect"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-actions">
              {selectedConnection?.status !== "connected" ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void handleConnectSelectedPlatform()}
                  disabled={isConnecting || disconnectingPlatform !== null}
                >
                  {isConnecting ? "Connecting..." : `Connect ${platformTitle(platform)}`}
                </button>
              ) : null}
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setShowPlatformModal(false);
                  setModalError(null);
                  void runGenerate();
                }}
              >
                Continue & generate
              </button>
            </div>
            {connectNotice ? <p className="note">{connectNotice}</p> : null}
            {modalError ? <p className="flash flash-error">{modalError}</p> : null}
          </div>
        </div>
      )}

      {showAuthPrompt && (
        <div className="modal-backdrop" onClick={() => setShowAuthPrompt(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Sign in required</h3>
            <p>Connecting social accounts requires an account.</p>
            <div className="modal-actions modal-actions-inline">
              <button className="button button-primary" type="button" onClick={handleSignIn}>
                Sign in
              </button>
              <a className="button button-secondary" href={SIGN_UP_URL} target="_blank" rel="noreferrer">
                Sign up
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
