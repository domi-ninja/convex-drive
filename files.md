# Files

## Operations and documentation

- `AGENTS.md` - Repo-wide self-hosting, identity, secret-handling, and deployment rules.
- `README.md` - Short copy, bootstrap, deployment, and development runbook.
- `shared-identifiers.md` - Confirmed collision findings, dead-code inventory, environment model, and implementation record.
- `.env.local.example` - Placeholder-only schema for generated local deployment values.
- `.gitignore` - Excludes credentials, deploy state, dependencies, builds, logs, and editor state.
- `deploy.yml` - Literal `pp` project identity, service graph, environment subsets, hooks, routes, and smoke checks.
- `deploy/caddy/humanist.caddy.tmpl` - Public site/API proxy with exact-origin CORS; dashboard is not published.
- `scripts/audit-copy.sh` - Read-only copy and environment-contract checks; never prints environment values.
- `scripts/bootstrap-prod-env.sh` - Full credential rotation and `.env.local` generation, including JWT keys and live Postgres synchronization.
- `scripts/generate-jwt.js` - Internal bootstrap helper that emits a new RSA private key and public JWKS.
- `scripts/ensure-minio-buckets.sh` - Idempotent post-deploy bucket creation using credentials read inside the remote MinIO container.
- `scripts/refresh-convex-admin-key.sh` - Generates the current backend's admin key and writes it to `.env.local`.
- `scripts/push-.env.local-to-convex.sh` - Pushes only `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` into Convex function storage.

## Build and tooling

- `package.json` - Package identity, commands, and direct dependencies.
- `pnpm-lock.yaml` - Reproducible dependency graph.
- `pnpm-workspace.yaml` - pnpm workspace and dependency policy.
- `Dockerfile` - Builds the Vite app and serves it with nginx.
- `nginx.conf` - SPA/static-file nginx configuration.
- `vite.config.ts` - Vite React build configuration and aliases.
- `tsconfig.json` - Shared strict frontend TypeScript options.
- `tsconfig.app.json` - Frontend TypeScript build project.
- `tsconfig.node.json` - TypeScript project for Vite configuration.
- `eslint.config.js` - Flat ESLint configuration for frontend and Convex TypeScript.
- `postcss.config.js` - PostCSS plugins for Tailwind and Autoprefixer.
- `tailwind.config.js` - Tailwind content paths, theme, and animation plugin.
- `components.json` - shadcn component aliases and style metadata.
- `convert-colors.js` - Development helper that normalizes color syntax before Vite starts.
- `index.html` - Vite HTML shell and Drive 2 page title.

## Convex backend

- `convex/auth.config.ts` - Self-hosted Convex Auth issuer configuration.
- `convex/auth.ts` - Standard password-only Convex Auth registration.
- `convex/schema.ts` - Auth, user, file, and folder tables and indexes.
- `convex/users.ts` - Authenticated viewer query.
- `convex/files.ts` - File metadata queries and mutations.
- `convex/folders.ts` - Folder tree queries and mutations.
- `convex/fileActions.ts` - File storage and ZIP-building actions.
- `convex/http.ts` - Convex Auth and ZIP HTTP route registration.
- `convex/httpDownloadZip.ts` - Authenticated ZIP response endpoint with exact-origin CORS.
- `convex/tsconfig.json` - Convex function TypeScript configuration.
- `convex/_generated/api.d.ts` - Generated typed Convex API surface.
- `convex/_generated/api.js` - Generated Convex API runtime helper.
- `convex/_generated/dataModel.d.ts` - Generated schema types.
- `convex/_generated/server.d.ts` - Generated server function types.
- `convex/_generated/server.js` - Generated server function runtime helpers.

## Frontend

- `src/main.tsx` - React and Convex Auth provider entry point.
- `src/App.tsx` - Theme, router, authentication gates, and app routes.
- `src/Header.tsx` - Drive 2 header, upload shortcut, and user menu.
- `src/index.css` - Tailwind entry point and theme variables.
- `src/vite-env.d.ts` - Vite environment types.
- `src/auth/SignInFormPassword.tsx` - Password sign-in/sign-up page wrapper.
- `src/auth/SignInWithPassword.tsx` - Standard password authentication form and error feedback.
- `src/contexts/FolderContext.tsx` - Typed root/current-folder state, path resolution, and folder contents.
- `src/pages/Home.tsx` - Main file-manager page.
- `src/pages/settings/Profile.tsx` - Read-only account profile page.
- `src/components/FileManageTable.tsx` - File/folder grid and list actions, selection, ZIP download, move, rename, and delete flows.
- `src/components/FileTreeModal.tsx` - Folder-tree move destination modal.
- `src/components/FileUploadArea.tsx` - Drag-and-drop and picker upload flow.
- `src/components/FileViewerModal.tsx` - File preview modal and supported-format rendering.
- `src/components/ThemeToggle.tsx` - Light, dark, and system theme selector.
- `src/components/UserMenu.tsx` - Profile link, theme control, and sign-out action.
- `src/components/index.ts` - Live component barrel export.
- `src/components/ui/button.tsx` - Shared button variants.
- `src/components/ui/dropdown-menu.tsx` - Shared Radix dropdown wrappers.
- `src/components/ui/input.tsx` - Shared input styling.
- `src/components/ui/toggle.tsx` - Shared Radix toggle styling.
- `src/components/ui/toggle-group.tsx` - Shared Radix toggle-group styling.
- `src/lib/file.ts` - Filename cleanup helper.
- `src/lib/utils.ts` - Tailwind class merge helper.
