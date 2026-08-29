# 0006. Deployment via Vercel's Git integration

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Marqd needs a deployment path. A common CI/CD pattern builds a deployable artifact in GitHub
Actions and pushes it to a host. But we have chosen managed services
(see [ADR 0003](0003-managed-services-no-docker.md)), and Vercel — the host for a Next.js app —
provides first-class Git-based deployment natively: it builds and deploys on every push, with
preview deployments per pull request. Duplicating that in a GitHub Actions deploy job would add
complexity for no benefit.

## Decision

**Deployment is handled by Vercel's native Git integration**, not by a GitHub Actions deploy job.
Once the repository is connected to a Vercel project, Vercel builds and deploys automatically:
**preview deployments** for pull requests and **production deployments** on merge to `main`.
GitHub Actions is used for **CI only** (quality gates + security scanning). The
`.github/workflows/deploy.yml` file is a **documented placeholder** that records this split and
does nothing on its own.

## Consequences

- **Positive:** Zero-config CD with previews and rollbacks, no deploy credentials to manage in
  Actions, and a clean division of labor: Actions verifies, Vercel ships.
- **Positive:** Environment variables (Supabase URL/keys, TMDB and RAWG keys) are managed in the
  Vercel dashboard, kept out of the repo.
- **Cost:** Deployment is coupled to Vercel. Mitigated because the app is a standard Next.js
  project deployable elsewhere; moving hosts would supersede this ADR and add a real deploy
  pipeline at that point.

## Alternatives Considered

- **GitHub Actions builds and deploys:** maximum control and host-portability, but reimplements
  what Vercel already does well for Next.js, including preview deployments. Deferred until/unless
  we leave Vercel.
- **Manual deploys (CLI):** simplest to set up, but loses automatic previews and the
  commit-to-live guarantee, and invites "works on my machine" drift.
