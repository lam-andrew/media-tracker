# Marqd working rules

The application is React/Vite in `apps/web`, Fastify in `apps/api`, shared contracts in
`packages/contracts`, and Docker/PostgreSQL in `infra`. `main` is the current app.
Read README.md and docs/CONTAINERS.md for setup; use Node 22+ for local tooling.

- Keep product naming centralized in `packages/contracts/src/index.ts` (`BRAND.name`).
- Preserve the accepted physical shelf design, rounded controls, palette tokens, and light/dark modes.
- Keep UI navigation independent of provider latency. Use cached data and optimistic edits with rollback.
- Enforce owner authorization in the API. Never expose server secrets in the frontend or commit env files.
- Preserve existing Compose project/database names and backup format identifiers for compatibility.
- Feature branch → PR → passing CI → main. Commit and push completed work.
- No GitHub issues for user-story tracking. Board games are the next main feature (docs/PLAN.md).
- Test meaningful behavior. Run lint, format, types, API/UI tests, and build for relevant changes.
  Database tests need an isolated TEST_DATABASE_URL; never run them against user data.
- Significant architecture changes require an ADR and current README/C4 diagrams.
- Historical Next.js/Supabase code lives at tag legacy-v1; it is not the active runtime.
- Host networking, production secrets, and migration acceptance belong to the deployment owner.
