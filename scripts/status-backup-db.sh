#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
COMPOSE_ENV_FILE=${BACKUP_COMPOSE_ENV_FILE:-"${REPO_ROOT}/scripts/backup-compose.env"}
COMPOSE_FILE=${BACKUP_COMPOSE_FILE:-"${REPO_ROOT}/docker-compose.backup.yaml"}

usage() {
  cat <<EOF
Usage: $(basename "$0") [snapshots|stats|check|all]

Runs restic status commands inside the backup container.

Environment overrides:
  BACKUP_COMPOSE_ENV_FILE   Path to the host-side compose env file
  BACKUP_COMPOSE_FILE       Path to docker-compose.backup.yaml
EOF
}

run_restic() {
  local label=$1
  local command=$2

  printf '\n==> %s\n' "${label}"
  docker compose \
    --env-file "${COMPOSE_ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    run --rm --entrypoint sh db-backup -lc "${command}"
}

[[ -f "${COMPOSE_ENV_FILE}" ]] || {
  printf 'ERROR: Compose env file not found: %s\n' "${COMPOSE_ENV_FILE}" >&2
  exit 1
}

[[ -f "${COMPOSE_FILE}" ]] || {
  printf 'ERROR: Compose file not found: %s\n' "${COMPOSE_FILE}" >&2
  exit 1
}

MODE=${1:-all}

case "${MODE}" in
  snapshots)
    run_restic "Snapshots" "restic snapshots"
    ;;
  stats)
    run_restic "Stats" "restic stats"
    ;;
  check)
    run_restic "Check" "restic check"
    ;;
  all)
    run_restic "Snapshots" "restic snapshots"
    run_restic "Stats" "restic stats"
    run_restic "Check" "restic check"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
