#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failed=false

fail() {
  echo "FAIL: $1" >&2
  failed=true
}

project="$(awk '$1 == "project:" { in_project=1; next } in_project && $1 == "name:" { print $2; exit }' deploy.yml)"
if [[ ! "$project" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  fail "deploy.yml needs a literal lowercase project.name"
fi

if rg -n 'humanist-convex-|https://humanist\.design|https://api\.humanist\.design|S3_STORAGE_MODULES_BUCKETonly' \
  --glob '!audit-copy.sh' deploy.yml Dockerfile .env.local.example scripts deploy/caddy src convex >/dev/null; then
  fail "operational files still contain a known stale identifier or bucket typo"
fi

if rg -n 'dash\.drive2\.humanist\.design' deploy/caddy >/dev/null; then
  fail "the Convex dashboard is publicly routed"
fi

if ! rg -Fq 'FUNCTION_ENV=(SITE_URL JWT_PRIVATE_KEY JWKS)' scripts/push-.env.local-to-convex.sh; then
  fail "the Convex function environment allowlist changed"
fi

if [[ -f .deploy/state.json ]]; then
  state_project="$(sed -n 's/^[[:space:]]*"project":[[:space:]]*"\([^"]*\)".*/\1/p' .deploy/state.json | head -n 1)"
  if [[ -n "$state_project" && "$state_project" != "$project" ]]; then
    fail ".deploy/state.json belongs to $state_project, not $project"
  fi
fi

required_env=(
  VITE_CONVEX_URL SITE_URL CONVEX_SELF_HOSTED_URL INSTANCE_NAME INSTANCE_SECRET
  POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_URL
  MINIO_ROOT_USER MINIO_ROOT_PASSWORD
  S3_STORAGE_EXPORTS_BUCKET S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET
  S3_STORAGE_MODULES_BUCKET S3_STORAGE_FILES_BUCKET S3_STORAGE_SEARCH_BUCKET
  JWT_PRIVATE_KEY JWKS
)

if [[ -f .env.local ]]; then
  permissions="$(stat -c '%a' .env.local)"
  [[ "$permissions" == "600" ]] || fail ".env.local permissions are $permissions, expected 600"
  for name in "${required_env[@]}"; do
    grep -q "^${name}=" .env.local || fail ".env.local is missing $name"
  done

  allowed_env=("${required_env[@]}" CONVEX_SELF_HOSTED_ADMIN_KEY VITE_CONVEX_SITE_URL)
  while IFS= read -r name; do
    allowed=false
    for expected in "${allowed_env[@]}"; do
      if [[ "$name" == "$expected" ]]; then
        allowed=true
        break
      fi
    done
    [[ "$allowed" == true ]] || fail ".env.local contains unowned key $name"
  done < <(sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env.local)
fi

remote_urls="$(git remote -v 2>/dev/null | awk '{print $2}' | sort -u || true)"
if [[ "$remote_urls" == *"convex-drive"* || "$remote_urls" == *"image-zero"* ]]; then
  echo "WARN: Git remotes still point at the source repositories." >&2
fi

if [[ "$failed" == true ]]; then
  exit 1
fi

echo "Copy and environment contract checks passed."
