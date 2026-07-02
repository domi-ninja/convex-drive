#!/usr/bin/env bash

set -euo pipefail

ENV_FILE=".env.local"
DEPLOYMENT_ARGS=()
PRUNE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    prod)
      DEPLOYMENT_ARGS=(--prod)
      shift
      ;;
    --deployment-name)
      if [[ $# -lt 2 ]]; then
        echo "Error: --deployment-name requires a value" >&2
        exit 1
      fi
      DEPLOYMENT_ARGS=(--deployment-name "$2")
      shift 2
      ;;
    --env-file)
      if [[ $# -lt 2 ]]; then
        echo "Error: --env-file requires a value" >&2
        exit 1
      fi
      ENV_FILE="$2"
      shift 2
      ;;
    --prune)
      PRUNE=true
      shift
      ;;
    *)
      DEPLOYMENT_ARGS=(--deployment-name "$1")
      echo "Using deployment: $1"
      shift
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE file not found" >&2
  exit 1
fi

echo "Pushing environment variables from $ENV_FILE to Convex..."

set_convex_env() {
  local name="$1"
  local value="$2"
  local output

  if output="$(npx convex env set "${DEPLOYMENT_ARGS[@]}" -- "$name" "$value" 2>&1)"; then
    echo "Set $name"
    return 0
  fi

  if [[ -n "$value" ]]; then
    output="${output//$value/<redacted>}"
  fi
  echo "$output" >&2
  return 1
}

if [[ "$PRUNE" == true ]]; then
  while IFS= read -r line; do
    var_name="${line%%=*}"
    [[ -z "$var_name" ]] && continue
    npx convex env remove "${DEPLOYMENT_ARGS[@]}" "$var_name" || true
  done < <(npx convex env list "${DEPLOYMENT_ARGS[@]}")
fi

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" || "$line" == \#* ]] && continue

  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
    var_name="${BASH_REMATCH[1]}"
    var_value="${BASH_REMATCH[2]}"

    if [[ "$var_value" =~ ^\"(.*)\"$ ]]; then
      var_value="${BASH_REMATCH[1]}"
    elif [[ "$var_value" =~ ^\'(.*)\'$ ]]; then
      var_value="${BASH_REMATCH[1]}"
    fi

    echo "Setting $var_name..."
    set_convex_env "$var_name" "$var_value"
  else
    echo "Skipping unsupported env line: $line" >&2
  fi
done <"$ENV_FILE"

echo "Done! Environment variables pushed to Convex."
