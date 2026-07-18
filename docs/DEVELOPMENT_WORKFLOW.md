# Development Workflow

## GitHub Source Of Truth

GitHub is the source of truth for all code, tests, fixtures, release notes, and
deployment runbooks.

## Branch Strategy

| Branch | Purpose | Rules |
| --- | --- | --- |
| `main` | Production | Manual release merges only. Codex must not directly commit here. |
| `develop` | Staging | Receives reviewed feature and hotfix PRs before staging deployment. |
| `feature/*` | Codex and developer tasks | All normal Codex work happens here. |
| `hotfix/*` | Urgent production fixes | Requires focused review and explicit deployment approval. |

## Codex Rules

- Codex works from `feature/*` branches unless the user explicitly requests a
  `hotfix/*` branch.
- Codex does not directly change production.
- Codex creates pull requests for review.
- Codex records Git checkpoints or commits for each major change.
- Codex maintains `docs/CHANGELOG.md`.
- Codex maintains `REVISION_LOG.md` with:
  - what changed
  - why it changed
  - files affected
  - migrations added
  - tests added
  - rollback notes

## Pull Request Expectations

Every PR must include:

- Scope summary.
- Migration summary, even when no migrations were added.
- Test summary.
- Staging impact.
- Deployment and rollback notes.
- Confirmation that no production API keys, customer data, inventory data,
  payment data, or customer credit data were committed.

## Checkpoints

Use small commits around meaningful milestones:

1. Schema or migration changes.
2. Service/domain logic changes.
3. Admin or public UI changes.
4. Provider adapter changes.
5. Test and fixture additions.
6. Documentation and deployment runbook updates.

## Current GitHub Status

The repository is `jonathanrhcooper/Pug-Game-Shop`.

Initial branch setup:

- `main`: production branch.
- `develop`: staging branch.
- `feature/codex-dev-staging-deployment-foundation`: current feature branch.
