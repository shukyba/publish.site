/** Parse API UTC timestamps, including values returned without a Z suffix. */
export function parseUtcDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const trimmed = iso.trim();
  if (!trimmed) return null;

  const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed);
  const normalized = hasOffset ? trimmed : `${trimmed}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatUtcLocal(iso?: string | null, fallback = "unspecified time"): string {
  const date = parseUtcDate(iso);
  return date ? date.toLocaleString() : fallback;
}

export function formatUtcLocalDate(iso?: string | null, fallback = "unspecified date"): string {
  const date = parseUtcDate(iso);
  return date ? date.toLocaleDateString() : fallback;
}
