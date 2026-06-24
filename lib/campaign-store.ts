import { GeneratedCampaign, SocialConnection } from "./types";

const CAMPAIGN_KEY = "publish_campaign";
const AUTH_KEY = "publish_auth";
const CONNECTIONS_KEY = "publish_connections";
const USER_ID_KEY = "publish_user_id";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!value) return null;
  const raw = value.slice(prefix.length);
  return decodeURIComponent(raw);
}

function getCookieBackedUserId(): string | null {
  return readCookie("AccountId") ?? readCookie("UserId");
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadCampaign(): GeneratedCampaign | null {
  if (typeof window === "undefined") return null;
  return safeParse<GeneratedCampaign>(window.localStorage.getItem(CAMPAIGN_KEY));
}

export function saveCampaign(campaign: GeneratedCampaign | null) {
  if (typeof window === "undefined") return;
  if (!campaign) {
    window.localStorage.removeItem(CAMPAIGN_KEY);
    return;
  }
  window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
}

export function loadAuth(): boolean {
  if (typeof window === "undefined") return false;
  if (getCookieBackedUserId()) return true;
  return window.localStorage.getItem(AUTH_KEY) === "1";
}

export function saveAuth(isAuthed: boolean) {
  if (typeof window === "undefined") return;
  if (isAuthed) window.localStorage.setItem(AUTH_KEY, "1");
  else window.localStorage.removeItem(AUTH_KEY);
}

export function clearAuthState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(USER_ID_KEY);
}

export function getPublishUserId(): string | null {
  if (typeof window === "undefined") return null;
  const cookieBacked = getCookieBackedUserId();
  if (cookieBacked) {
    window.localStorage.setItem(USER_ID_KEY, cookieBacked);
    return cookieBacked;
  }
  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const created = `publish_${Math.random().toString(36).slice(2, 12)}`;
  window.localStorage.setItem(USER_ID_KEY, created);
  return created;
}

export function loadConnections(): SocialConnection[] | null {
  if (typeof window === "undefined") return null;
  return safeParse<SocialConnection[]>(window.localStorage.getItem(CONNECTIONS_KEY));
}

export function saveConnections(connections: SocialConnection[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}
