#!/bin/bash
set -euo pipefail

WEBHOOK_DOMAIN="hooks.websites.fail"

# Get repo name from git remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ -z "$REMOTE_URL" ]]; then
  echo "Error: No git remote 'origin' found"
  exit 1
fi

# Extract owner/repo from SSH or HTTPS URL
if [[ "$REMOTE_URL" =~ git@github\.com:(.+)\.git$ ]]; then
  REPO="${BASH_REMATCH[1]}"
elif [[ "$REMOTE_URL" =~ https://github\.com/(.+)\.git$ ]]; then
  REPO="${BASH_REMATCH[1]}"
else
  echo "Error: Could not parse GitHub repo from: $REMOTE_URL"
  exit 1
fi

# Derive hook path: owner/repo-name -> deploy-template-test-repo-name
REPO_NAME="${REPO#*/}"
HOOK_PATH="deploy-template-test-${REPO_NAME}"
WEBHOOK_URL="https://${WEBHOOK_DOMAIN}/hooks/${HOOK_PATH}"

# Generate random secret
SECRET=$(openssl rand -hex 32)

echo "Setting up webhook for: $REPO"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Delete existing webhooks for this repo
EXISTING_HOOKS=$(gh api "repos/${REPO}/hooks" --jq '.[].id' 2>/dev/null || echo "")
if [[ -n "$EXISTING_HOOKS" ]]; then
  echo "Removing existing webhooks..."
  for HOOK_ID in $EXISTING_HOOKS; do
    gh api "repos/${REPO}/hooks/${HOOK_ID}" -X DELETE
    echo "  Deleted hook $HOOK_ID"
  done
  echo ""
fi

# Create webhook via GitHub API
gh api "repos/${REPO}/hooks" \
  -X POST \
  -f name='web' \
  -f "config[url]=${WEBHOOK_URL}" \
  -f 'config[content_type]=json' \
  -f "config[secret]=${SECRET}" \
  -f 'events[]=push' \
  -F active=true > /dev/null

echo "Webhook created successfully!"
echo ""
echo "Secret: ${SECRET}"
