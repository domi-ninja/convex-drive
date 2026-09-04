#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE file not found" >&2
  exit 1
fi

get_env() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

convex_url="$(get_env CONVEX_SELF_HOSTED_URL)"
admin_key="$(get_env CONVEX_SELF_HOSTED_ADMIN_KEY)"
if [[ -z "$convex_url" || -z "$admin_key" ]]; then
  echo "Error: self-hosted Convex URL or admin key is missing from $ENV_FILE" >&2
  exit 1
fi

# Keep CLI deployment credentials isolated from its application URL discovery.
umask 077
cli_env="$(mktemp .convex-cli.env.XXXXXX)"
trap 'rm -f "$cli_env"' EXIT
{
  printf 'CONVEX_SELF_HOSTED_URL=%s\n' "$convex_url"
  printf 'CONVEX_SELF_HOSTED_ADMIN_KEY=%s\n' "$admin_key"
} > "$cli_env"

npx convex dev --once --env-file "$cli_env"
sed -i '/^VITE_CONVEX_SITE_URL=/d' "$ENV_FILE"

echo "Synced Convex functions and removed the CLI-generated compatibility key."
