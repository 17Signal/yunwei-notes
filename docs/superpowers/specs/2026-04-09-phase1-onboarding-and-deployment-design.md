# Phase 1 Onboarding and Deployment Design

## Summary

This phase improves the open-source onboarding experience for `yunwei-notes` without changing the core product model. The goal is to make the project easier for new users to start, easier for maintainers to support, and safer to evolve in later phases.

Phase 1 focuses on four outcomes:

1. Add a Docker-based startup path for local and server-friendly deployment.
2. Add a setup workflow that validates environment prerequisites and initializes project state.
3. Improve public-facing documentation for startup, deployment, and backup guidance.
4. Add targeted tests around startup and core API behavior.

This phase explicitly does not include editor UX changes, attachment-management UI expansion, or state-management refactors inside the main app shell.

## Goals

- Let a new user choose either Docker or local Node.js startup from the repository docs.
- Reduce setup mistakes by validating required configuration before runtime failures happen.
- Keep existing business behavior stable while improving onboarding and maintainability.
- Establish a cleaner release boundary for a first post-open-source quality pass.

## Non-Goals

- Refactor `components/app-shell.tsx`
- Add auto-save or editor workflow changes
- Redesign API response contracts
- Expand the multi-user/authentication model
- Redesign the visual system

## Current Constraints

The repository already has a clean open-source baseline:

- Next.js 16 app router application
- Prisma 7 with PostgreSQL
- Uploads stored on local disk under `./data/uploads`
- Single-password authentication via `.env`
- Existing tests cover auth and query validation only

The main onboarding friction today is that startup assumes a manually prepared PostgreSQL environment and several manual setup steps. That is acceptable for the original author but creates avoidable failure points for a new GitHub visitor.

## Proposed Approach

### 1. Docker-first onboarding path

Add a repository-level container workflow that can start the app and PostgreSQL together with consistent defaults. The Docker path should be the recommended quick-start for first-time users because it removes local database setup as a prerequisite.

The Docker workflow should:

- Build the Next.js app from the repository source
- Start PostgreSQL with a persistent volume
- Mount the uploads directory so attachments survive container restarts
- Read configuration from `.env`
- Keep the command surface small and documented

### 2. Explicit setup workflow

Add a `setup` script that performs preflight checks and initialization tasks before the user runs the app. This script should be informative rather than magical.

The setup workflow should:

- Check whether `.env` exists
- Validate that required variables are present
- Validate important constraints such as `SESSION_SECRET` minimum length
- Create the upload directory if missing
- Run `prisma generate`
- Print the next commands the user should run

The setup workflow should fail loudly with actionable messages instead of allowing the user to discover configuration errors later through unrelated runtime failures.

### 3. Layered documentation

Keep `README.md` focused on quick-start and project overview, then move longer operational guidance into a dedicated deployment document.

Documentation should clearly cover:

- Docker quick-start
- Local development quick-start
- Required environment variables
- Database migration commands
- Upload storage location
- Backup scope and recommendations
- Reverse-proxy/Tailscale guidance as optional deployment enhancements

### 4. Confidence-building tests

Add targeted tests that protect the Phase 1 surface area without trying to fully redesign the test strategy in one pass.

The first layer of coverage should focus on:

- setup/preflight validation behavior
- auth/session stability already relied on by onboarding
- at least one core API route success case and failure case
- startup-path assumptions that can regress silently

## File Plan

### New files

- `compose.yaml`
  - Docker Compose entry point for app + database
- `Dockerfile`
  - App image build definition
- `docs/deployment.md`
  - Expanded deployment and operations guide
- `docs/superpowers/plans/2026-04-09-phase1-onboarding-and-deployment.md`
  - Implementation plan to be written after design approval
- `tests/...`
  - New focused tests for setup and selected API routes

### Likely new scripts/modules

- `scripts/setup.mjs`
  - Project setup and preflight checks
- `lib/setup/...` or similar helper module if the setup logic needs to be shared with tests

### Updated files

- `package.json`
  - Add setup and Docker helper scripts
- `README.md`
  - Rework quick-start and link to deployment docs
- `.env.example`
  - Align with the preferred onboarding flow if needed
- `.gitignore`
  - Only if new local support files or worktree directories must be ignored

## Architecture Notes

This phase should minimize risk by staying at the project boundary:

- deployment surface
- initialization surface
- documentation surface
- test surface

Core note/category/upload behavior should remain unchanged unless a small code adjustment is required to support packaging or testing. Any such adjustment should preserve existing API semantics.

If setup validation logic becomes non-trivial, it should be extracted into a small testable helper rather than embedded entirely inside a script file. The implementation should prefer small, focused utilities over a single large initialization script.

## Error Handling

Error handling for this phase should optimize for clarity during onboarding:

- Missing `.env` should produce a direct explanation and the expected remediation step.
- Missing or invalid required env vars should produce specific, named messages.
- Setup failures should stop execution and return a non-zero exit code.
- Documentation should match actual command names and environment variables exactly.

The runtime API layer should keep its current behavior unless a change is necessary to support tests or containerization.

## Testing Strategy

The test plan for this phase is intentionally narrow and practical.

Required verification areas:

- Existing tests continue to pass.
- New setup/preflight tests cover both valid and invalid initialization states.
- New API tests cover at least one happy path and one guarded/error path.
- Final project verification runs:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm build`

Stretch coverage is allowed if it stays contained, but broad integration harness work is out of scope for this phase.

## Delivery and Version Control

This work should be completed on a dedicated feature branch, not on `main`.

Recommended branch name:

- `feat/phase1-deploy-and-quality`

Recommended commit boundaries:

1. `feat: add docker compose local stack`
2. `feat: add project setup workflow`
3. `docs: improve onboarding and deployment guides`
4. `test: cover core startup and api paths`

The exact commit count can vary slightly if a cleaner split emerges during implementation, but the work should remain staged and reviewable.

## Acceptance Criteria

Phase 1 is complete when all of the following are true:

1. A new user can follow repository docs and choose either Docker startup or local startup.
2. The setup workflow reports missing configuration explicitly and early.
3. Deployment documentation covers startup, migrations, upload storage, and backup scope.
4. `pnpm test`, `pnpm lint`, and `pnpm build` all pass after the changes.
5. The work is completed on an isolated branch with reviewable commits.
6. Existing core functionality remains intact: login, categories, notes, uploads, and search.

## Risks and Mitigations

- Risk: Docker setup drifts from local setup.
  - Mitigation: keep env variable names identical and document one source of truth.
- Risk: setup script grows into an untestable monolith.
  - Mitigation: extract validation helpers when branching logic appears.
- Risk: Phase 1 scope expands into product refactors.
  - Mitigation: keep non-goals explicit and defer UI/architecture refactors to later phases.
