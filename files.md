# Files

- `deploy.yml` - `pp` deployment config for the Drive clone, including service definitions, hooks, routes, health checks, and persistent volume paths.
- `deploy/caddy/humanist.caddy.tmpl` - Caddy route template rendered by `pp`; routes public hostnames to the auto-assigned service ports.
- `scripts/ensure-minio-buckets.sh` - Post-deploy hook that finds the current stack's MinIO container and creates the Convex storage buckets.
- `scripts/refresh-convex-admin-key.sh` - Post-deploy hook that generates a Convex admin key from the current stack's backend container and writes it to `.env.local`.
- `scripts/push-.env.local-to-convex.sh` - Post-deploy hook that pushes `.env.local` values into the self-hosted Convex deployment.
- `scripts/generate-jwt.js` - Generates a JWT signing key and stores it in `.env.local`.
- `Dockerfile` - Builds the Vite frontend and serves the static output with nginx.
- `nginx.conf` - nginx config for serving the SPA and static assets.
