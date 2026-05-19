#!/bin/sh
# Maintainer saja: refresh bundle di Git dari tema Metronic classic.
# Harian/build: tidak perlu — bundle sudah di frontend/public/metronic/ (lihat BUNDLE.md).
set -e
SRC="${METRONIC_CLASSIC_ASSETS:-$HOME/Downloads/=]/metronic-603/metronic_v6.0.3/theme/classic/assets}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/metronic/assets"
if [ ! -d "$SRC" ]; then
  echo "Sumber tidak ada: $SRC" >&2
  echo "Set METRONIC_CLASSIC_ASSETS ke folder assets Metronic Anda." >&2
  exit 1
fi
mkdir -p "$DEST"
rsync -a "$SRC/" "$DEST/"
echo "OK: Metronic assets -> $DEST"
