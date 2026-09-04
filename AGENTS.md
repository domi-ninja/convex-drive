# Repository operating rules

This repository is self-hosted with `pp`, Docker, Caddy, and self-hosted Convex. Do not add Vercel configuration or assume Convex Cloud.

## Deployment identity

- `deploy.yml` owns the literal `pp` project slug. `pp` does not currently interpolate an environment variable in `project.name`.
- The site hostname is the human input. The API hostname is `api.<site-hostname>`.
- The dashboard stays private unless the operator explicitly requests a protected public route.
- A copied repository needs new Git remotes. Never infer or create those URLs.

## Environment lifecycle

- Never read, print, diff, or commit `.env.local`. Use `.env.local.example` to inspect the schema.
- `.env.local` is the canonical ignored source for both `pp` deployment values and the self-hosted Convex CLI.
- `scripts/bootstrap-prod-env.sh <site-hostname>` rotates all generated credentials. On an existing deployed stack, it updates the live Postgres role before replacing the local password and preserves names tied to existing data.
- `CONVEX_SELF_HOSTED_ADMIN_KEY` cannot be bootstrapped locally. `scripts/refresh-convex-admin-key.sh` writes it after the backend is healthy.
- Convex function variables are not automatically shared with the backend. `scripts/push-.env.local-to-convex.sh` must push the allowlisted values from `.env.local`: `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`.
- Never expand that allowlist to include Postgres, MinIO, S3, instance, or Convex admin credentials.

## Production sequence

1. Run `pnpm run audit:copy`.
2. Run `scripts/bootstrap-prod-env.sh <site-hostname>` to rotate credentials.
3. Run `pp deploy`.
4. Let the deploy hooks create buckets, refresh the Convex admin key, push the allowlisted function environment, and sync Convex functions.
5. Verify the frontend and `https://api.<site-hostname>/version`.

Do not delete deployment volumes or rename existing database/bucket identifiers as part of credential rotation.
