# Repository operating rules

This repository is self-hosted with `pp`, Docker, Caddy, and self-hosted Convex. Do not add Vercel configuration or assume Convex Cloud.

## Deployment identity

- `deploy.yml` owns the literal `pp` project slug. `pp` does not currently interpolate an environment variable in `project.name`.
- The site hostname is the human input. The API hostname is `api.<site-hostname>`.
- The dashboard stays private unless the operator explicitly requests a protected public route.
- Domi explicitly selected `ssh://git@git.domi.ninja:2222/domi-ninja/convex-drive.git` for this checkout. `package.json` records that choice. Independent copies must update their repository URL and Git remotes together; never invent destinations.

## Environment lifecycle

- Never read, print, diff, or commit `.env.local`. Use `.env.local.example` to inspect the schema.
- `.env.local` is the canonical ignored source for both `pp` deployment values and the self-hosted Convex CLI.
- `scripts/bootstrap-prod-env.sh <site-hostname>` generates all credentials locally, preserves names tied to existing data, and saves a mode-0600 `.env.local.previous` before replacing an existing environment. It must never mutate a running service. Treat recovery copies as secrets too.
- The Postgres image synchronizes the configured role password before accepting network connections. Deploy this image with current credentials before the first rotation. TCP health checks must not pass against its temporary Unix-socket-only initialization server.
- Failed rotation recovery is `scripts/bootstrap-prod-env.sh --restore`, then `pp deploy`. Bare `pp rollback` across credential changes is insufficient because hooks use the current local environment. Do not overwrite an outstanding recovery copy or rotate during deployment.
- `CONVEX_SELF_HOSTED_ADMIN_KEY` cannot be bootstrapped locally. `scripts/refresh-convex-admin-key.sh` writes it after the backend is healthy.
- Convex function variables are not automatically shared with the backend. `scripts/push-.env.local-to-convex.sh` must push the allowlisted values from `.env.local`: `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`.
- Convex CLI may add `VITE_CONVEX_SITE_URL` to `.env.local`. It is derived from the API URL and is not a human-configured input.
- Never expand that allowlist to include Postgres, MinIO, S3, instance, or Convex admin credentials.

## Production sequence

Deploy maintained releases from a clean `main` checkout. After deployment verify that `pp status` records the same commit as `git rev-parse HEAD`, and inspect all five service states. Retained previous releases are rollback history; do not redeploy them or rewrite their contents.

1. Run `pnpm run audit:copy`. Remotes must match `package.json` repository.url; `--configuration-only` explicitly skips that check.
2. For a fresh copy or deliberate rotation, run `scripts/bootstrap-prod-env.sh <site-hostname>` and audit again. Routine deployments reuse credentials.
3. Run `pp deploy`.
4. Let the deploy hooks create buckets, refresh the Convex admin key, push the allowlisted function environment, and sync Convex functions.
5. Verify the frontend and `https://api.<site-hostname>/version`.

Do not delete deployment volumes or rename existing database/bucket identifiers as part of credential rotation.

## Authorization and verification

- Public file/folder operations must authenticate callers and verify ownership before traversal, storage access, or returning download URLs. Derive user IDs from authentication, not client claims.
- Run `pnpm test`, `pnpm lint`, and `pnpm build` for application changes. For Postgres startup or rotation changes also run `bash scripts/test-postgres-rotation.sh` against disposable local Docker resources.
- Keep `shared-identifiers.md` as a current completed/open/deferred report and update `files.md` when adding files.
