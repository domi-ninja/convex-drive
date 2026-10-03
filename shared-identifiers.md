# Copy isolation and security status

Updated 2026-10-03. This is the implementation record, not a list of work still planned. Findings come from source, `.env.local.example`, tests, and deployment metadata. Credentials are consumed only by operational scripts and never printed.

## Copy contract

Replace these inputs before deploying a new copy:

| Input | Current value | Locations |
| --- | --- | --- |
| App name | `Drive 2` | `src/Header.tsx`, `index.html`, README |
| Project slug | `drive2-humanist-design` | `deploy.yml` project, images, data paths, route destination; `package.json` and lockfile |
| Site hostname | `drive2.humanist.design` | Caddy site/redirect/CORS blocks, deployment smoke checks; bootstrap argument |
| Deploy target | `deploy@p3.domi.ninja` | `deploy.yml` host SSH target |
| Git repository | `ssh://git@git.domi.ninja:2222/domi-ninja/convex-drive.git`, explicitly selected by Domi | `package.json` repository.url and `.git/config` |

API URLs derive as `api.<site-hostname>`. Backend and dashboard origins read the generated canonical API URL. Caddy still contains literal site/API hostnames. The dashboard has no public route; if deliberately published later its hostname is `dash.<site-hostname>`.

Do not copy `.env.local`, `.env.local.previous`, `.deploy`, or ignored editor state. New copies generate new names and credentials. Rotations of existing installations preserve database, instance, and bucket names because those identify existing data.

## Completed

| Finding | Implementation |
| --- | --- |
| Generic bootstrap identities and reused secrets | Required hostname; names derive from project/site; each run generates all local credentials. |
| Fresh-copy instance and database defaults disagreed | New instance names use the project slug; Postgres DB names replace its hyphens with underscores, matching [Convex's database selection](https://github.com/get-convex/convex-backend/blob/main/crates/clusters/src/lib.rs). Existing names remain untouched. |
| Bootstrap changed the live Postgres role before deploy | Bootstrap now changes local files only, keeps a mode-0600 `.env.local.previous`, and refuses to overwrite an outstanding recovery copy. |
| Postgres initialization ignored rotated passwords on existing volumes | The Postgres image updates the configured role through a private Unix socket before starting its network listener. Deploying an earlier configuration restores its password too. TCP health checks cannot pass during temporary initialization. |
| Infrastructure variables uploaded into Convex function storage | Push script owns exactly `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`; unrestricted upload/pruning removed. Existing unrelated remote variables are not automatically deleted. |
| Duplicate or unused environment inputs | Removed human-configured `VITE_SITE_URL`, `VITE_CONVEX_SITE_URL`, `DATABASE_URL`, AWS credential copies, SSE toggle, Scaleway credentials, and Better Auth secret. CLI may recreate `VITE_CONVEX_SITE_URL` as derived output. |
| Misspelled modules bucket | Corrected `S3_STORAGE_MODULES_BUCKETonly`. |
| Arbitrary credentialed CORS origins | Site-only preflight and ZIP origin checks. |
| Public dashboard route | Removed; dashboard service remains available privately. |
| MinIO credentials in command arguments | Helper receives credentials through stdin, configures `MC_HOST_local` internally, and passes only bucket names as arguments. |
| Hardcoded SSH fallbacks | Operational hooks derive their target from `deploy.yml`. |
| Weak copy checks | Parsed configuration checks compare slug, image tags, data paths, route destination, site/API origins, env schema, duplicate keys, DB credential mapping, bucket names, and copied deployment state. Git remotes must match the operator-selected repository URL. |
| Public folder queries lacked authorization | Folder lookup, path resolution, recursive contents, and ZIP traversal verify ownership. Root and name lookups derive the user from authentication. |
| Anonymous upload URL generation | Authentication is required before issuing a URL. |
| Self-parent folder moves | Reject moving a folder into itself or descendants. |
| Overbuilt Convex sync wrapper | Removed; deploy calls `npx convex dev --once --env-file .env.local` directly. |

Confirmed unused demo code removed in the earlier cleanup: OAuth/email/OTP/reset examples, their UI/logos, unused duplicate components/configs, commented chat, messages schema/functions, placeholder desktop route, mail/webhook helpers, and their unused dependencies. Standard password auth remains.

## Environment and recovery

`.env.local` is the canonical ignored source. `.env.local.example` lists its keys. Bootstrap generates `INSTANCE_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `JWT_PRIVATE_KEY`, and `JWKS`. The healthy backend generates the admin key during deploy.

Postgres, MinIO, instance and admin credentials are deployment/CLI values. Only `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` are copied into Convex function storage. The push hook must run after every rotation or restoration.

Rotation is not a zero-downtime transaction. Deploy the new Postgres startup behavior once with existing credentials before rotating. Keep the recovery environment until the rotated deployment is verified. If deployment fails, run `scripts/bootstrap-prod-env.sh --restore`, then `pp deploy`; this reconciles infrastructure and function variables with the recovered environment. Never rely on bare `pp rollback` across credential changes: its hooks read the current local environment. Releases predating the Postgres startup fix cannot restore a role password themselves.

## Verification

All copy-isolation, authorization, and recovery changes are integrated into local `main`. The README describes the clean-main release workflow. Deployment commit and release IDs live in `pp status` rather than a hardcoded documentation value that becomes stale at the next release.

- `pnpm test`: anonymous/cross-user denial, owner access, root scoping, upload authorization, move cycles, configuration drift, bootstrap generation/rotation/restoration.
- `bash scripts/test-postgres-rotation.sh`: disposable local Postgres verifies fresh initialization, changed-password authentication, rejection of the old password, rollback authentication, and preservation of a stored row.
- `pnpm lint`, `pnpm build`, `pp plan`, and `pnpm run audit:copy --configuration-only` validate the application and existing deployment configuration.
- The full `pnpm run audit:copy` verifies Git remotes against `package.json` repository.url. `--configuration-only` explicitly skips that check; it is not proof that a new copy has independent remotes.

## Open and deferred

- **Resolved:** Domi explicitly selected `convex-drive` as the canonical Git repository. Independent copies must change the declared repository URL and remotes together. Other live deployments sharing this repository must retain their deployment identity when adopting changes.
- **Deferred by request:** `pp` project-name interpolation, mail/OAuth setup, and publishing the dashboard.
- **Outside this pass:** a general infrastructure upgrade policy and a complete application security audit. These checks cover the confirmed issues above, not every possible defect or external dependency.
