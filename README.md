# Drive 2

A self-hosted file manager backed by Convex, Postgres, and MinIO.

## Copy and deploy

Replace the app name, literal project slug, site hostname, deploy SSH target, and Git remotes listed in [shared-identifiers.md](shared-identifiers.md). Do not copy `.deploy`, `.env.local`, or `.env.local.previous`. API URLs derive as `api.<site-hostname>`; Caddy hostnames and smoke URLs must agree with the hostname supplied to bootstrap.

```sh
pnpm install
pnpm run audit:copy
scripts/bootstrap-prod-env.sh drive2.humanist.design
pnpm run audit:copy
pp deploy
```

`.env.local.example` documents the schema. Bootstrap creates mode-0600 `.env.local` with fresh Postgres, MinIO, instance, and JWT credentials. Deploy hooks create buckets, refresh the admin key, push only `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` into Convex, and sync functions. Convex CLI may add derived `VITE_CONVEX_SITE_URL` output. The dashboard has no public Caddy route.

The full audit fails on source Git remotes. Use `pnpm run audit:copy --configuration-only` to check an existing deployment while its destination Git URL is pending; this explicitly omits the remote check.

## Release workflow

`main` contains the maintained application, deployment scripts, and documentation. Merge completed work into `main`, run the checks below, and deploy from a clean checkout. Routine releases use the existing credentials.

```sh
git switch main
git status --short
pnpm run audit:copy --configuration-only
pnpm test
pnpm lint
pnpm build
pp plan
pp deploy
pp status
```

`pp status` records the deployed commit and current/previous release IDs. After deployment, its `git_sha` should match `git rev-parse HEAD`, with `dirty: false`. The deploy covers web, Convex backend/dashboard, Postgres, MinIO, routes, function environment, and Convex functions. Older retained releases are rollback history, not additional live deployments.

Publishing `main` is pending the destination Git repository URL. Do not push Drive 2's renamed configuration to the source repository by accident.

## Rotate and recover

Routine deployments use `pp deploy`; they do not need fresh keys.

For an existing deployment, first deploy the Postgres startup fix with the current environment. Then bootstrap and deploy to rotate. Bootstrap preserves names tied to stored data and saves the old environment as `.env.local.previous`. It never changes a running service. Postgres applies its container's configured password before accepting network connections, including when an earlier configuration is restored.

If a rotation fails:

```sh
scripts/bootstrap-prod-env.sh --restore
pp deploy
```

This restores the local credentials and reapplies them to infrastructure and Convex functions. Recovery is explicit; rotation is not zero-downtime. Do not use bare `pp rollback` across credential changes because its hooks read the current `.env.local`. Old releases from before this fix lack password synchronization.

Keep the mode-0600 recovery copy until the deployment is verified, then archive it securely outside the repository or delete it. Bootstrap refuses another rotation while that copy exists. Never commit either environment file or run bootstrap concurrently with a deployment.

## Development and checks

```sh
pnpm dev
pnpm test
pnpm lint
pnpm build
bash scripts/test-postgres-rotation.sh
```

The Postgres test requires local Docker and only creates disposable test data. It never contacts production.
