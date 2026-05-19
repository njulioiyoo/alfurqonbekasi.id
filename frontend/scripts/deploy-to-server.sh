#!/bin/sh
# Upload hasil build ke server.
# Contoh:
#   export DEPLOY_HOST=148.230.96.65
#   export DEPLOY_USER=root
#   export DEPLOY_PATH=/var/www/alfurqonbekasi.id
#   export DEPLOY_SSH_PASS='...'   # opsional; pakai ssh-with-pass.exp
#   cd frontend && npm run build && npm run deploy:server
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
EXPECT="$ROOT/scripts/ssh-with-pass.exp"
HOST="${DEPLOY_HOST:?Set DEPLOY_HOST, mis. 148.230.96.65}"
USER="${DEPLOY_USER:-root}"
PATH_REMOTE="${DEPLOY_PATH:?Set DEPLOY_PATH, mis. /var/www/alfurqonbekasi.id}"
TARGET="${USER}@${HOST}:${PATH_REMOTE}/"
SSH_OPTS="-o StrictHostKeyChecking=accept-new"
RSYNC_SSH="ssh $SSH_OPTS"

run_rsync() {
  src="$1"
  dest="$2"
  shift 2
  if [ -n "${DEPLOY_SSH_PASS:-}" ] && [ -f "$EXPECT" ]; then
    export DEPLOY_SSH_CMD="rsync -avz $* -e \"$RSYNC_SSH\" \"$src\" \"$dest\""
    expect "$EXPECT"
  else
    rsync -avz "$@" -e "$RSYNC_SSH" "$src" "$dest"
  fi
}

if [ ! -f "$DIST/metronic/assets/vendors/general/jquery/dist/jquery.js" ]; then
  echo "ERROR: dist/metronic belum ada. Jalankan: npm run copy:metronic && npm run build" >&2
  exit 1
fi

echo ">> Rsync Metronic bundle (dist/metronic/) ..."
run_rsync "$DIST/metronic/" "${TARGET}metronic/" --delete

echo ">> Rsync frontend build (assets, admin, index, bismillah) ..."
run_rsync "$DIST/assets/" "${TARGET}assets/" --delete
run_rsync "$DIST/admin/" "${TARGET}admin/" --delete
run_rsync "$DIST/index.html" "${TARGET}index.html"
if [ -d "$DIST/bismillah" ]; then
  run_rsync "$DIST/bismillah/" "${TARGET}bismillah/" --delete
fi

echo "OK: deploy ke ${TARGET}"
echo "Cek: curl -I https://dev.alfurqonbekasi.id/metronic/assets/vendors/general/jquery/dist/jquery.js"
