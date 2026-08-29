/**
 * Global brand configuration.
 *
 * The product's display name lives here and nowhere else, so a late rebrand is a
 * one-line change. Everything user-facing (page title, nav wordmark, metadata,
 * empty states) reads from `BRAND` — never hardcode the name in components.
 *
 * The repository/package is named generically ("media-tracker") on purpose; this
 * file is the single source of truth for the marketing name.
 */
export const BRAND = {
  /** Display name shown throughout the UI. Change this to rebrand. */
  name: "Marqd",
  /** One-line tagline. */
  tagline: "Mark what you've experienced.",
} as const;
