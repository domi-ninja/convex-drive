#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Disposable local database only. No production environment or SSH access.
image=drive2-postgres-rotation-test
docker build -q -t "$image" deploy/postgres >/dev/null
volume="$(docker volume create --label purpose=drive2-rotation-test)"
container=""
cleanup() {
  if [[ -n "$container" ]]; then docker rm -f "$container" >/dev/null; fi
  docker volume rm "$volume" >/dev/null
}
trap cleanup EXIT

start() {
  local password="$1"
  container="$(docker run -d --mount "type=volume,source=$volume,target=/var/lib/postgresql/data" \
    -e POSTGRES_USER=rotation_test -e POSTGRES_DB=rotation_test \
    -e "POSTGRES_PASSWORD=$password" "$image")"
  for _ in {1..30}; do
    if docker exec "$container" pg_isready -h 127.0.0.1 -U rotation_test -d rotation_test >/dev/null 2>&1; then return; fi
    sleep 1
  done
  docker logs "$container" >&2
  return 1
}
stop() { docker stop "$container" >/dev/null; docker rm "$container" >/dev/null; container=""; }
sql() {
  local address
  address="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$container")"
  docker exec -e "PGPASSWORD=$1" "$container" psql -X -h "$address" -U rotation_test -d rotation_test -v ON_ERROR_STOP=1 -Atc "$2"
}

start old-test-password
sql old-test-password 'CREATE TABLE preserved (value text); INSERT INTO preserved VALUES ('\''still here'\'');' >/dev/null
stop
start new-test-password
[[ "$(sql new-test-password 'SELECT value FROM preserved')" == 'still here' ]]
if sql old-test-password 'SELECT 1' >/dev/null 2>&1; then echo 'Old password still works' >&2; exit 1; fi
stop
start old-test-password
[[ "$(sql old-test-password 'SELECT value FROM preserved')" == 'still here' ]]
if sql new-test-password 'SELECT 1' >/dev/null 2>&1; then echo 'Rolled-back password still works' >&2; exit 1; fi
echo 'Fresh startup, password rotation, rollback, and data preservation passed.'
