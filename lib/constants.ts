/**
 * One fixed user for the single-user MVP. When auth lands, replace reads of this
 * with the authenticated user id and enable row-level security. See docs/BUILD.md §7.
 */
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

/** Generic tracking states, shown with type-aware labels (see lib/media-config). */
export const STATUSES = [
  "backlog",
  "in_progress",
  "completed",
  "abandoned",
] as const;

export type Status = (typeof STATUSES)[number];
