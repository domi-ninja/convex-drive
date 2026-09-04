# Copy-safety and cleanup plan

Audited `drive2.humanist.design` against the adjacent `drive.humanist.design` checkout on 2026-09-04. I did not inspect `.env.local`; environment findings come from `.env.local.example`, source, scripts, and deploy configuration.

## Copy contract

A copied deployment has four independent human inputs:

- App name: `Drive 2`
- `pp` project slug: `drive2-humanist-design`
- Site hostname: `drive2.humanist.design`
- Deploy target: `deploy@p3.domi.ninja`

The API hostname is always `api.<site-hostname>`. A dashboard hostname, when deliberately published, is `dash.<site-hostname>`. The project slug remains a literal in `deploy.yml` because `pp` project-name interpolation is not being changed in this pass.

Before another copy is deployed, replace the app name, project slug, site hostname, deploy target, and Git remotes. Do not copy `.deploy/state.json` or ignored local state.

## Confirmed collision risks

| Finding | Evidence | Planned treatment |
| --- | --- | --- |
| Both checkouts push to the same repositories. | Their `.git/config` remotes are identical. | Operator must create and set new remotes; this cannot be inferred by a repository script. |
| The bootstrap uses the old generic `humanist` identity. | `scripts/bootstrap-prod-env.sh` defaults to `humanist.design`, `api.humanist.design`, `humanist`, and `humanist-convex-*`. | Make the script derive URLs, database name, and bucket names from the current project slug and a required site hostname. |
| The bootstrap preserves old credentials. | Generated values use `set_if_missing`. | Make every bootstrap run replace `.env.local` and rotate every locally generated credential. |
| Convex receives infrastructure secrets. | `scripts/push-.env.local-to-convex.sh` uploads every entry. | Continue using `.env.local` as the canonical source, but push only the function-owned allowlist. |
| Convex sync can erase foreign configuration. | `--prune` deletes every remote function variable. | Remove arbitrary pruning. Only the allowlisted keys are owned by this repository. |
| One required bucket variable is misspelled. | `deploy.yml` requires `S3_STORAGE_MODULES_BUCKETonly`. | Correct it and add a static copy/config audit. |
| CORS accepts arbitrary credentialed origins. | The Caddy preflight reflects the request `Origin`; ZIP responses use the API origin. | Allow only `https://drive2.humanist.design` at the proxy and function layers. |
| The dashboard is public. | Caddy publishes `dash.drive2.humanist.design`. | Keep the dashboard service internal; do not create a public route by default. |
| MinIO credentials appear in an SSH command line. | `scripts/ensure-minio-buckets.sh` passes them as remote shell arguments. | Send hook configuration over standard input. |
| The admin-key hook asks for an unused value. | `scripts/refresh-convex-admin-key.sh` does not read `INSTANCE_SECRET`. | Remove that hook requirement. |

## Environment model

`.env.local` is the ignored, mode-`0600` source for both `pp` and the Convex CLI. It contains two trust classes:

- Deployment and CLI values stay local: instance, Postgres, MinIO, S3, and `CONVEX_SELF_HOSTED_ADMIN_KEY`.
- Convex function values are copied from the same file by `scripts/push-.env.local-to-convex.sh`: `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`.

The push script must never upload the first class. Standard password auth needs the JWT pair, so JWT generation belongs in the full bootstrap flow. The admin key is different: it can only be generated from a healthy backend and is refreshed by the post-deploy hook.

Remove these redundant inputs:

- `VITE_SITE_URL`
- `VITE_CONVEX_SITE_URL` as a human input. Convex CLI may recreate it as derived compatibility output.
- `DATABASE_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_DISABLE_SSE`
- `SCALEWAY_ACCESS_KEY`
- `SCALEWAY_SECRET_KEY`
- `SCALEWAY_PROJECT_ID`
- `BETTER_AUTH_SECRET`

Keep `VITE_CONVEX_URL` and `CONVEX_SELF_HOSTED_URL`; different consumers require those names even though both contain the derived API origin. Generate `POSTGRES_DB` and all five bucket names from the project slug. Map the backend's AWS values directly from the generated MinIO credentials in `deploy.yml`.

Each bootstrap run regenerates:

- `INSTANCE_SECRET`
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `JWT_PRIVATE_KEY`
- `JWKS`

This is intentional credential rotation, not an idempotent “fill missing values” command.

## Confirmed dead legacy

The live frontend entry point renders only the standard password form and file manager. The following have no live import path and will be removed:

- OAuth, email-code/link, reset-code/link, showcase, and OTP frontend modules under `src/auth/`
- Provider logo components and UI primitives used only by those modules
- `src/components/Content.tsx`, the duplicate root `src/SignOutButton.tsx`, and the fully commented `src/Chat/Chat.tsx`
- Unused card, dialog, skeleton, Radix toast, code-display, and duplicate utility modules
- The placeholder desktop-client page and its otherwise unreferenced HTTP identity endpoint
- Convex OAuth, Resend, Twilio, custom password, password reset, OTP, random-code, and messages modules
- The `messages` table
- `setup.mjs`, the mail DNS checker, and the repository-webhook helper, none of which is called by package scripts or deploy hooks
- Duplicate legacy ESLint and PostCSS configs
- Empty test scaffolding and dependencies; the repository contains no tests
- Self-link dependencies and packages used only by removed code

This is a deletion of unreachable demo code, not removal of a working authentication path. `Password` from `@convex-dev/auth` remains the only provider.

## Implementation sequence

1. Commit this evidence-based plan before source changes.
2. Remove confirmed dead demo code, dependencies, schema, and routes.
3. Consolidate user lookup on `api.users.viewer` and keep only standard password auth.
4. Make `scripts/bootstrap-prod-env.sh <site-hostname>` recreate `.env.local`, derive non-secrets, and generate every local secret including the JWT pair without printing values.
5. Make Convex environment sync an explicit allowlist sourced from `.env.local`.
6. Simplify `deploy.yml`, correct the bucket typo, lock CORS, keep the dashboard private, and stop putting MinIO secrets in command arguments.
7. Add a read-only audit script that checks copied state, stale identifiers, required/generated environment names, and unsafe Convex upload logic without reading secret values.
8. Document the exact self-hosted deploy contract in root `AGENTS.md`, `README.md`, `.env.local.example`, and `files.md`.
9. Run static checks and build.
10. Rotate `.env.local`, deploy with `pp`, let the hooks refresh the admin key and push the allowlisted function environment, then verify the frontend and API.

## Deferred deliberately

- `pp` project-name interpolation
- Creating or changing Git remotes without target repository URLs
- Mail and OAuth provider setup
- Publishing the Convex dashboard
- Infrastructure image upgrades or digest changes; those need a separate compatibility review and are not identifier isolation
