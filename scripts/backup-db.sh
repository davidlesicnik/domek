#!/usr/bin/env bash

set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >&2
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

json_escape() {
  local value=${1//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

prune_old_backups() {
  log "Pruning restic snapshots (keep-last=${RECENT_KEEP}, keep-daily=${DAILY_KEEP})"
  restic forget \
    --group-by paths,tags \
    --keep-last "${RECENT_KEEP}" \
    --keep-daily "${DAILY_KEEP}" \
    --prune
}

if [[ $# -gt 1 ]]; then
  fail "Usage: $0 [path/to/backup-db.env]"
fi

if [[ $# -eq 1 ]]; then
  BACKUP_ENV_FILE=$1
fi

if [[ -n "${BACKUP_ENV_FILE:-}" ]]; then
  [[ -f "${BACKUP_ENV_FILE}" ]] || fail "BACKUP_ENV_FILE does not exist: ${BACKUP_ENV_FILE}"
  # shellcheck disable=SC1090
  source "${BACKUP_ENV_FILE}"
fi

: "${BACKUP_DATABASE_URL:?Set BACKUP_DATABASE_URL to the direct Supabase Postgres URL on port 5432.}"
: "${BACKUP_DEST_DIR:?Set BACKUP_DEST_DIR to the local backup working directory.}"
: "${RESTIC_REPOSITORY:?Set RESTIC_REPOSITORY to the restic repository path or URL.}"

RESTIC_PASSWORD_FILE=${RESTIC_PASSWORD_FILE:-}
RESTIC_PASSWORD=${RESTIC_PASSWORD:-}
ALLOW_RESTIC_INIT=${ALLOW_RESTIC_INIT:-false}
RECENT_KEEP=${RECENT_KEEP:-96}
DAILY_KEEP=${DAILY_KEEP:-35}
COMPRESSOR=${COMPRESSOR:-zstd}
PGAPPNAME=${PGAPPNAME:-domek-backup}
BACKUP_TMP_DIR=${BACKUP_TMP_DIR:-${BACKUP_DEST_DIR%/}/tmp}
BACKUP_LATEST_DIR=${BACKUP_LATEST_DIR:-${BACKUP_DEST_DIR%/}/latest}
BACKUP_LOCK_FILE=${BACKUP_LOCK_FILE:-${BACKUP_DEST_DIR%/}/backup.lock}
BACKUP_DESTINATION_SENTINEL=${BACKUP_DESTINATION_SENTINEL:-${BACKUP_DEST_DIR%/}/.domek-backup-target}
RESTIC_TAGS=${RESTIC_TAGS:-domek,database}

export TZ=UTC
export PGAPPNAME
export RESTIC_REPOSITORY

if [[ -z "${RESTIC_PASSWORD_FILE}" && -z "${RESTIC_PASSWORD}" ]]; then
  fail "Set RESTIC_PASSWORD_FILE or RESTIC_PASSWORD for restic repository access."
fi

if [[ -n "${RESTIC_PASSWORD_FILE}" && -n "${RESTIC_PASSWORD}" ]]; then
  fail "Set only one of RESTIC_PASSWORD_FILE or RESTIC_PASSWORD, not both."
fi

if [[ "${BACKUP_DATABASE_URL}" == *"pgbouncer=true"* ]]; then
  fail "BACKUP_DATABASE_URL appears to be a transaction pooler URL. Use the direct connection or the Supavisor session pooler on port 5432 instead."
fi

if [[ "${BACKUP_DATABASE_URL}" != *":5432/"* ]]; then
  fail "BACKUP_DATABASE_URL must target a Supabase direct connection or Supavisor session pooler on port 5432."
fi

if [[ "${COMPRESSOR}" != "zstd" && "${COMPRESSOR}" != "gzip" ]]; then
  fail "COMPRESSOR must be either 'zstd' or 'gzip'."
fi

if [[ "${ALLOW_RESTIC_INIT}" != "true" && "${ALLOW_RESTIC_INIT}" != "false" ]]; then
  fail "ALLOW_RESTIC_INIT must be either 'true' or 'false'."
fi

require_command flock
require_command pg_dump
require_command pg_restore
require_command restic
require_command sha256sum
require_command find
require_command awk
require_command mkdir
require_command mv
require_command rm
require_command mktemp

if [[ "${COMPRESSOR}" == "zstd" ]]; then
  require_command zstd
  COMPRESSED_EXT="dump.zst"
else
  require_command gzip
  COMPRESSED_EXT="dump.gz"
fi

[[ -d "${BACKUP_DEST_DIR}" ]] || fail "BACKUP_DEST_DIR is not a directory: ${BACKUP_DEST_DIR}"
[[ -w "${BACKUP_DEST_DIR}" ]] || fail "BACKUP_DEST_DIR is not writable: ${BACKUP_DEST_DIR}"

if [[ -n "${RESTIC_PASSWORD_FILE}" && ! -r "${RESTIC_PASSWORD_FILE}" ]]; then
  fail "RESTIC_PASSWORD_FILE is not readable: ${RESTIC_PASSWORD_FILE}"
fi

if [[ -n "${RESTIC_PASSWORD_FILE}" ]]; then
  export RESTIC_PASSWORD_FILE
fi

if [[ -n "${RESTIC_PASSWORD}" ]]; then
  export RESTIC_PASSWORD
fi

if [[ ! -e "${BACKUP_DESTINATION_SENTINEL}" ]]; then
  fail "Backup destination sentinel is missing: ${BACKUP_DESTINATION_SENTINEL}. Refusing to write backups because the NAS mount may not be present."
fi

mkdir -p "${BACKUP_TMP_DIR}" "${BACKUP_LATEST_DIR}"
[[ -d "${BACKUP_TMP_DIR}" ]] || fail "BACKUP_TMP_DIR is not a directory: ${BACKUP_TMP_DIR}"
[[ -w "${BACKUP_TMP_DIR}" ]] || fail "BACKUP_TMP_DIR is not writable: ${BACKUP_TMP_DIR}"

exec 9>"${BACKUP_LOCK_FILE}"
if ! flock -n 9; then
  log "Another backup run is already in progress; skipping this invocation."
  exit 0
fi

TIMESTAMP=$(date -u +'%Y%m%dT%H%M%SZ')
RUN_DIR=$(mktemp -d "${BACKUP_TMP_DIR%/}/run-${TIMESTAMP}-XXXXXX")
RUN_BASENAME="domek-prod-${TIMESTAMP}"
DUMP_PATH="${RUN_DIR}/${RUN_BASENAME}.dump"
COMPRESSED_PATH="${RUN_DIR}/${RUN_BASENAME}.${COMPRESSED_EXT}"
CHECKSUM_PATH="${COMPRESSED_PATH}.sha256"
MANIFEST_PATH="${RUN_DIR}/${RUN_BASENAME}.json"
LATEST_SWAP_DIR="${BACKUP_LATEST_DIR}.next"

cleanup() {
  rm -rf "${RUN_DIR}" "${LATEST_SWAP_DIR}"
}

trap cleanup EXIT

log "Starting pg_dump into ${DUMP_PATH}"
pg_dump \
  --dbname="${BACKUP_DATABASE_URL}" \
  --format=custom \
  --file="${DUMP_PATH}" \
  --compress=0 \
  --no-owner \
  --no-privileges

if [[ "${COMPRESSOR}" == "zstd" ]]; then
  log "Compressing dump with zstd"
  zstd --quiet --rm -19 --output="${COMPRESSED_PATH}" "${DUMP_PATH}"
else
  log "Compressing dump with gzip"
  gzip -9 --stdout "${DUMP_PATH}" > "${COMPRESSED_PATH}"
  rm -f "${DUMP_PATH}"
fi

log "Validating dump with pg_restore --list"
if [[ "${COMPRESSOR}" == "zstd" ]]; then
  zstd --quiet --decompress --stdout "${COMPRESSED_PATH}" | pg_restore --list >/dev/null
else
  gzip --decompress --stdout "${COMPRESSED_PATH}" | pg_restore --list >/dev/null
fi

(
  cd "${RUN_DIR}"
  sha256sum "$(basename "${COMPRESSED_PATH}")" > "$(basename "${CHECKSUM_PATH}")"
)

ARTIFACT_SIZE=$(wc -c < "${COMPRESSED_PATH}" | awk '{print $1}')
cat > "${MANIFEST_PATH}" <<EOF
{
  "timestamp_utc": "$(json_escape "${TIMESTAMP}")",
  "artifact": "$(json_escape "$(basename "${COMPRESSED_PATH}")")",
  "checksum_file": "$(json_escape "$(basename "${CHECKSUM_PATH}")")",
  "compressor": "$(json_escape "${COMPRESSOR}")",
  "pg_dump_format": "custom",
  "restic_repository": "$(json_escape "${RESTIC_REPOSITORY}")",
  "pg_app_name": "$(json_escape "${PGAPPNAME}")",
  "artifact_size_bytes": ${ARTIFACT_SIZE}
}
EOF

if ! restic cat config >/dev/null 2>&1; then
  if [[ "${ALLOW_RESTIC_INIT}" == "true" ]]; then
    log "Initializing restic repository"
    restic init
  else
    fail "restic repository is not accessible or is not initialized. Fix the repository/mount, or set ALLOW_RESTIC_INIT=true for the first run."
  fi
fi

log "Updating latest local copy in ${BACKUP_LATEST_DIR}"
rm -rf "${LATEST_SWAP_DIR}"
mkdir -p "${LATEST_SWAP_DIR}"
mv "${COMPRESSED_PATH}" "${CHECKSUM_PATH}" "${MANIFEST_PATH}" "${LATEST_SWAP_DIR}/"
rm -rf "${BACKUP_LATEST_DIR}"
mv "${LATEST_SWAP_DIR}" "${BACKUP_LATEST_DIR}"

log "Backing up latest directory to restic"
IFS=',' read -r -a RESTIC_TAG_ARRAY <<< "${RESTIC_TAGS}"
RESTIC_BACKUP_ARGS=()
for tag in "${RESTIC_TAG_ARRAY[@]}"; do
  [[ -n "${tag}" ]] || continue
  RESTIC_BACKUP_ARGS+=(--tag "${tag}")
done

restic backup "${RESTIC_BACKUP_ARGS[@]}" "${BACKUP_LATEST_DIR}"

prune_old_backups

log "Backup completed successfully"
