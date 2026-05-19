#!/bin/sh
# Bundle Metronic ada di Git: frontend/public/metronic/assets (bukan vendor npm mentah).
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
  echo "ERROR: Bundle Metronic di public/metronic/assets tidak lengkap atau rusak." >&2
  echo "" >&2
  echo "Harusnya sudah ada di Git. Di server: git pull origin master" >&2
  echo "Jangan timpa folder ini dengan vendor npm mentah (tanpa dist/)." >&2
  echo "" >&2
  echo "Maintainer — refresh dari tema classic:" >&2
  echo "  export METRONIC_CLASSIC_ASSETS=/path/ke/metronic_v6/theme/classic/assets" >&2
  echo "  npm run copy:metronic" >&2
  echo "" >&2
  echo "Lihat: public/metronic/BUNDLE.md" >&2
  exit 1
fi
