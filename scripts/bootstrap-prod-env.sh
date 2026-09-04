#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_HOST="${1:-}"
ENV_FILE="${2:-$ROOT_DIR/.env.local}"

if [[ -z "$SITE_HOST" ]]; then
  echo "Usage: scripts/bootstrap-prod-env.sh <site-hostname> [env-file]" >&2
  exit 1
fi

if [[ ! "$SITE_HOST" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "Error: invalid site hostname: $SITE_HOST" >&2
  exit 1
fi

PROJECT="$({
  awk '
    $1 == "project:" { in_project=1; next }
    in_project && $1 == "name:" {
      value=$2
      gsub(/^["'\'']|["'\'']$/, "", value)
      print value
      exit
    }
    in_project && $1 !~ /^ / && $1 != "" { in_project=0 }
  ' "$ROOT_DIR/deploy.yml"
})"

if [[ -z "$PROJECT" || ! "$PROJECT" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Error: deploy.yml has no valid literal project.name" >&2
  exit 1
fi

API_HOST="api.$SITE_HOST"
DEFAULT_DB_NAME="${PROJECT//-/_}"

get_existing_nonsecret() {
  local key="$1"
  local fallback="$2"
  local value=""

  if [[ -f "$ENV_FILE" ]]; then
    value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  fi

  printf '%s' "${value:-$fallback}"
}

# Preserve names that point at existing data. Fresh copies without an env file
# receive names derived from the literal pp project slug.
INSTANCE_NAME="$(get_existing_nonsecret INSTANCE_NAME "$API_HOST")"
POSTGRES_DB="$(get_existing_nonsecret POSTGRES_DB "$DEFAULT_DB_NAME")"
POSTGRES_USER="$(get_existing_nonsecret POSTGRES_USER "$DEFAULT_DB_NAME")"
S3_STORAGE_EXPORTS_BUCKET="$(get_existing_nonsecret S3_STORAGE_EXPORTS_BUCKET "$PROJECT-convex-exports")"
S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET="$(get_existing_nonsecret S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET "$PROJECT-convex-snapshot-imports")"
S3_STORAGE_MODULES_BUCKET="$(get_existing_nonsecret S3_STORAGE_MODULES_BUCKET "$PROJECT-convex-modules")"
S3_STORAGE_FILES_BUCKET="$(get_existing_nonsecret S3_STORAGE_FILES_BUCKET "$PROJECT-convex-files")"
S3_STORAGE_SEARCH_BUCKET="$(get_existing_nonsecret S3_STORAGE_SEARCH_BUCKET "$PROJECT-convex-search")"

umask 077
ENV_DIR="$(dirname "$ENV_FILE")"
mkdir -p "$ENV_DIR"
TEMP_FILE="$(mktemp "$ENV_DIR/.env.local.XXXXXX")"
trap 'rm -f "$TEMP_FILE"' EXIT

INSTANCE_SECRET="$(openssl rand -hex 32)"
POSTGRES_PASSWORD="$(openssl rand -hex 32)"
MINIO_ROOT_USER="$(openssl rand -hex 12)"
MINIO_ROOT_PASSWORD="$(openssl rand -hex 32)"

{
  printf 'VITE_CONVEX_URL=https://%s\n' "$API_HOST"
  printf 'SITE_URL=https://%s\n' "$SITE_HOST"
  printf 'CONVEX_SELF_HOSTED_URL=https://%s\n' "$API_HOST"
  printf 'INSTANCE_NAME=%s\n' "$INSTANCE_NAME"
  printf 'INSTANCE_SECRET=%s\n' "$INSTANCE_SECRET"
  printf 'POSTGRES_DB=%s\n' "$POSTGRES_DB"
  printf 'POSTGRES_USER=%s\n' "$POSTGRES_USER"
  printf 'POSTGRES_PASSWORD=%s\n' "$POSTGRES_PASSWORD"
  printf 'POSTGRES_URL=postgres://%s:%s@postgres:5432?sslmode=disable\n' "$POSTGRES_USER" "$POSTGRES_PASSWORD"
  printf 'MINIO_ROOT_USER=%s\n' "$MINIO_ROOT_USER"
  printf 'MINIO_ROOT_PASSWORD=%s\n' "$MINIO_ROOT_PASSWORD"
  printf 'S3_STORAGE_EXPORTS_BUCKET=%s\n' "$S3_STORAGE_EXPORTS_BUCKET"
  printf 'S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET=%s\n' "$S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET"
  printf 'S3_STORAGE_MODULES_BUCKET=%s\n' "$S3_STORAGE_MODULES_BUCKET"
  printf 'S3_STORAGE_FILES_BUCKET=%s\n' "$S3_STORAGE_FILES_BUCKET"
  printf 'S3_STORAGE_SEARCH_BUCKET=%s\n' "$S3_STORAGE_SEARCH_BUCKET"
  node "$ROOT_DIR/scripts/generate-jwt.js"
} > "$TEMP_FILE"

STATE_PROJECT=""
if [[ -f "$ROOT_DIR/.deploy/state.json" ]]; then
  STATE_PROJECT="$(sed -n 's/^[[:space:]]*"project":[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT_DIR/.deploy/state.json" | head -n 1)"
fi

if [[ -f "$ENV_FILE" && "$STATE_PROJECT" == "$PROJECT" ]]; then
  SSH_TARGET="$(awk '$1 == "ssh:" { print $2; exit }' "$ROOT_DIR/deploy.yml")"
  if [[ -z "$SSH_TARGET" ]]; then
    echo "Error: could not determine the deploy SSH target" >&2
    exit 1
  fi
  if [[ ! "$POSTGRES_USER" =~ ^[A-Za-z0-9_.-]+$ || ! "$POSTGRES_DB" =~ ^[A-Za-z0-9_.-]+$ ]]; then
    echo "Error: existing Postgres identifiers contain unsupported characters" >&2
    exit 1
  fi

  remote_command="container=\$(docker ps --filter label=pp.project=$(printf '%q' "$PROJECT") --filter label=pp.service=postgres --format '{{.Names}}' | head -n 1); test -n \"\$container\" && docker exec -i \"\$container\" psql -v ON_ERROR_STOP=1 -U $(printf '%q' "$POSTGRES_USER") -d $(printf '%q' "$POSTGRES_DB")"
  printf 'ALTER ROLE "%s" WITH PASSWORD '\''%s'\'';\n' "$POSTGRES_USER" "$POSTGRES_PASSWORD" | ssh "$SSH_TARGET" "$remote_command" >/dev/null
  echo "Rotated the live Postgres role before replacing local credentials."
fi

chmod 600 "$TEMP_FILE"
mv "$TEMP_FILE" "$ENV_FILE"
trap - EXIT

echo "Rotated production credentials in $ENV_FILE"
echo "Preserved existing data-bearing names when present."
echo "The Convex admin key will be generated from the healthy backend during deploy."
