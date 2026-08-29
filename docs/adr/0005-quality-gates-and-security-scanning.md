# 0005. CI quality gates and security scanning

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Even as a solo project, Marqd is built to professional standards and is intended to grow into a
real product. Consistent quality and basic security hygiene should be enforced automatically
rather than relying on discipline, and should catch problems before they reach `main`.

## Decision

We will enforce quality and security gates both locally (pre-commit) and in CI (GitHub Actions):

- **Quality (`ci.yml`), on every push/PR:** install, then `lint` (ESLint), `format:check`
  (Prettier), `typecheck` (`tsc --noEmit`), `test` (Vitest), and a production `build`.
- **Security (`security.yml`), on every push/PR and weekly:** **gitleaks** (secret scan),
  **npm audit** (production dependency vulnerabilities), and **Trivy** (filesystem
  vuln/secret/misconfig, results uploaded as SARIF).
- **CodeQL (`codeql.yml`)**: static analysis (SAST) for TypeScript, on push/PR to `main` and
  weekly.
- **Dependabot**: weekly dependency-update PRs for npm and GitHub Actions.
- **Pre-commit hooks:** fast checks (format, lint, type-check) on commit; the test suite on push.

## Consequences

- **Positive:** Regressions in style, types, tests, or build fail fast, in CI and before commit.
  Secrets and known-vulnerable dependencies are surfaced automatically.
- **Positive:** New non-trivial logic is expected to ship with tests, keeping the provider mappers
  and core helpers honest.
- **Cost / caveat:** CodeQL and Trivy SARIF **uploads** require a public repository or GitHub
  Advanced Security. On a private repo the jobs run but the upload step is skipped; the scans
  still execute and fail on findings where configured. Some newer lint/test tooling expects a
  recent Node patch release — CI pins a compatible Node version.

## Alternatives Considered

- **No CI / manual checks:** unacceptable for a project meant to become a product; discipline
  alone does not scale.
- **Quality gates only, no security scanning:** cheaper, but secret leaks and vulnerable
  dependencies are exactly the class of problem worth automating early, and the scanners are
  low-cost to run.
