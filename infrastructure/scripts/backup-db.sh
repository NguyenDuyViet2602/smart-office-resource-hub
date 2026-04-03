#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./infrastructure/scripts/backup-db.sh
#   DB_NAME=mydb DB_USER=postgres CONTAINER=smart-office-postgres ./infrastructure/scripts/backup-db.sh
#   OUTPUT_DIR=./backups ./infrastructure/scripts/backup-db.sh

CONTAINER="${CONTAINER:-smart-office-postgres}"
DB_NAME="${DB_NAME:-smart_office}"
DB_USER="${DB_USER:-postgres}"
OUTPUT_DIR="${OUTPUT_DIR:-./backups}"
TS="$(date +%F_%H-%M-%S)"
OUT_FILE="${OUTPUT_DIR}/${DB_NAME}_${TS}.sql"

mkdir -p "${OUTPUT_DIR}"

echo "[backup-db] Exporting ${DB_NAME} from container ${CONTAINER}..."

docker exec -t "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${OUT_FILE}"

echo "[backup-db] Done: ${OUT_FILE}"
