# Drive 2

A self-hosted file manager backed by Convex, Postgres, and MinIO.

## Copy and deploy

A new copy needs an app name, literal `pp` project slug, site hostname, deploy SSH target, and new Git remotes. Replace those repository identifiers first; API URLs are derived as `api.<site-hostname>`. Do not copy `.deploy/state.json`, `.env.local`, or editor-specific ignored state.

```sh
pnpm install
pnpm run audit:copy
scripts/bootstrap-prod-env.sh drive2.humanist.design
pp deploy
```

The bootstrap recreates `.env.local` with fresh instance, Postgres, MinIO, and JWT credentials. For an existing deployment, it preserves data-bearing names and updates the running Postgres role before replacing the local password. It never prints generated secrets.

After the backend becomes healthy, deploy hooks create the MinIO buckets, regenerate `CONVEX_SELF_HOSTED_ADMIN_KEY`, copy only `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` from `.env.local` into the Convex function environment, and sync the functions.

`.env.local.example` documents keys only. Do not put credentials in it. The Convex dashboard has no public Caddy route by default.

## Development

```sh
pnpm dev
pnpm lint
pnpm build
```
