#!/bin/sh
# Pastikan aset Metronic BUNDLE (bukan vendor mentah) ada sebelum build/deploy.
# Vendor mentah punya src/ + package.json tanpa dist/ → CMS error "Unexpected token '<'".
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/public/metronic/assets"

check_file() {
  rel="$1"
  if [ ! -f "$BASE/$rel" ]; then
    echo "  - $rel" >&2
    return 1
  fi
  return 0
}

missing=0
for f in \
  "vendors/general/jquery/dist/jquery.js" \
  "vendors/general/tether/dist/css/tether.css" \
  "vendors/general/bootstrap/dist/js/bootstrap.min.js" \
  "vendors/general/toastr/build/toastr.min.js" \
  "css/demo2/style.bundle.css" \
  "js/demo2/scripts.bundle.js"
do
  check_file "$f" || missing=1
done

if [ "$missing" -ne 0 ]; then
  echo "" >&2
  echo "ERROR: Aset Metronic tidak lengkap atau masih VENDOR MENTAH (tanpa folder dist/)." >&2
  echo "" >&2
  echo "Jangan upload isi vendors/ dari npm/GitHub. Pakai bundle resmi Metronic v6:" >&2
  echo "  theme/classic/assets/  →  frontend/public/metronic/assets/" >&2
  echo "" >&2
  echo "Di mesin dev:" >&2
  echo "  export METRONIC_CLASSIC_ASSETS=/path/ke/metronic_v6/theme/classic/assets" >&2
  echo "  cd frontend && npm run copy:metronic && npm run build" >&2
  echo "" >&2
  echo "Deploy ke server: rsync seluruh frontend/dist/ (termasuk dist/metronic/)." >&2
  echo "Jangan deploy public/metronic mentah atau folder vendors npm." >&2
  exit 1
fi
