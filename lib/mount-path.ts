/** Public URL prefix when Publish is mounted under www.cliposts.com (e.g. /publish). */
export const MOUNT_PATH = (process.env.NEXT_PUBLIC_MOUNT_PATH ?? "").replace(/\/$/, "");

export function withMountPath(path: string): string {
  if (!MOUNT_PATH) return path;

  const hashIndex = path.indexOf("#");
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";

  const queryIndex = beforeHash.indexOf("?");
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";

  if (!pathname || pathname === "/") {
    return `${MOUNT_PATH}${query}${hash}`;
  }

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${MOUNT_PATH}${normalized}${query}${hash}`;
}
