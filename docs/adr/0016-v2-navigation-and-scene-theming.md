# 0016 — V2 navigation hierarchy and scene theming

- Status: Accepted
- Date: 2026-09-27

## Context

Nine peer navigation choices mixed destinations, library presentations, and account
utilities. Independent room colors bypassed palette choices, and dark mode discarded
palette overrides. A negative toolbar margin overlapped subsequently added filters.

## Decision

Keep Library, Discover, and Journal as primary destinations. Room, Gallery, and Favorites
remain library views. Journal contains Insights & goals; Discover contains catalog search.
Settings, imports, exports, and sign-out belong in the profile menu. Existing URLs remain valid.

Preserve the approved Study 02 room, typography, rounded surfaces, and dimensional shadows.
Use normal document flow for collection controls and responsive grouping. Compact headings
replace the immersive hero on utility screens.

`apps/web/src/theme.ts` owns palette and lighting tokens, including scene walls, shelf,
synthetic spines, text, surfaces, and action contrast. Original cover artwork retains its
colors. Both lighting modes honor the chosen palette and persist locally. Settings exposes
lighting and palette independently. Tests cover all ten palette/mode combinations.

## Consequences

Navigation describes tasks instead of exposing every screen equally. Utilities remain
reachable through labeled secondary controls. New scene surfaces must consume shared tokens;
adding a palette must pass contrast checks. This does not change API or container interfaces.

## Alternatives considered

A sidebar would consume horizontal room space. Keeping nine tabs with smaller typography
would preserve the hierarchy problem. Separate dark CSS palettes would duplicate sources of truth.

## Research

- [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
  informed primary versus secondary placement.
- [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
  informed preserving the distinctive room and quiet surrounding controls; existing approved
  palette/type choices take precedence over generic style recommendations.
