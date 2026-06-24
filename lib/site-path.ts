/** Must match `basePath` in next.config.mjs (override via NEXT_PUBLIC_BASE_PATH). */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/publish").replace(/\/$/, "");

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) {
    return `${BASE_PATH}/${path}`;
  }
  if (path === "/") {
    return BASE_PATH || "/";
  }
  return `${BASE_PATH}${path}`;
}
