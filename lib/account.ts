const ACCOUNT_ID_KEY = "AccountId";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("=")) || null;
}

export function getAccountId(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = window.localStorage.getItem(ACCOUNT_ID_KEY)?.trim();
  if (fromStorage) return fromStorage;
  return readCookie(ACCOUNT_ID_KEY);
}
