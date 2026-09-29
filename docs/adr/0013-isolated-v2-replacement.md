# 0013. Build v2 as an isolated replacement

- **Status:** Accepted
- **Date:** 2026-09-26

## Context

Repeated performance improvements have not achieved the user's desired responsiveness.
The user also wants a new visual experience and eventual containerized homelab hosting.
Study 02 is the leading design, while Study 01 remains a saved alternative.
The existing deployment and user data must remain available during development.

## Decision

Build v2 on the `v2` branch of the existing media-tracker repository, in the separate
`/Users/andrewlam/Documents/media-tracker-v2` worktree. Preserve `main` as v1 during development.
Use Study 02's spatial library, soft lighting, depth, frosted controls, and rounded components
as the visual baseline. Keep both prototypes as archived references, not production code.

Target a React/TypeScript frontend built with Vite, a separate TypeScript API, PostgreSQL,
and Docker Compose for homelab deployment. Choose the specific API framework, authentication
implementation, and migration strategy in subsequent ADRs after validating requirements.

V2 will replace v1's implementation when ready; it is not a permanent second product.
Maintain a recoverable v1 release and database backup before cutover. Preserve user data.
Readiness criteria and the first implementation slice are in [V2.md](../V2.md).

This decision governs the v2 development workflow. ADRs 0001, 0003, and 0006 still describe
the operational v1 system; formally supersede them when the corresponding replacement
architecture and deployment are implemented, without implying v1 has already migrated.

## Consequences

The rebuild has its own working tree and history on a branch, without changing production.
Both implementations temporarily require maintenance. Database/account migration, performance,
accessibility, and deployment checks are required before replacing v1. A frontend rewrite
alone is not proof of improved production performance.

## Alternatives Considered

- Continue patching v1: does not address the requested redesign and hosting direction together.
- Create a new repository: unnecessarily splits project history, standards, and decisions.
- Rewrite main immediately: risks breaking the current app before the replacement is usable.
- Ship v1 and v2 forever: conflicts with the user's explicit replacement plan.
