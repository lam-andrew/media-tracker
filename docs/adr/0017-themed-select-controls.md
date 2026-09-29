# 0017 — Shared themed select controls

- Status: Accepted
- Date: 2026-09-27

## Context

Native operating-system select menus do not follow the application's palette. Filters,
tracking fields, goals, and import matching need consistent menus and keyboard behavior.

## Decision

Use Radix Select behind `apps/web/src/components/Select.tsx`. Keep option definitions
with their existing media configuration. The wrapper handles empty values, selection,
checkmarks, keyboard navigation, and viewport collision positioning. Menu portals mount
inside the current theme root, or the native detail dialog when present, so color tokens
and the dialog's top layer are preserved.

Import uses source cards, a drop area and file picker, preparation guidance, progress,
and a review section. Reading/matching a file does not save it; the user explicitly
imports reviewed entries. Existing entries continue to be skipped.

## Consequences

A single component controls menus throughout v2, with an additional UI dependency.
Browser verification covers real dropdown keyboard interaction, Escape dismissal,
dialog portals, and theme inheritance. Application unit tests isolate state/network
behavior with a native-select adapter; import tests cover review and invalid files.
Import remains usable on narrow screens and uses the same light/dark palette tokens.

## Alternatives considered

Styling native select triggers alone cannot style OS menus. A bespoke dropdown would
require maintaining keyboard interaction, focus restoration, and collision handling.

## Reference

[Radix Select documentation](https://www.radix-ui.com/primitives/docs/components/select)
