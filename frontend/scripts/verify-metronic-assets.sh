#!/bin/sh
# Pastikan aset Metronic ada sebelum build/deploy — tanpa ini CMS dapat HTML alih-alih .js (Unexpected token '<').
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="$ROOT/public/metronic/assets/vendors/general/jquery/dist/jquery.js"
if [ ! -f "$MARKER" ]; then
  echo "ERROR: Aset Metronic tidak ditemukan." >&2
  echo "  Jalankan: cd frontend && npm run copy:metronic" >&2
  echo "  Lalu build ulang: npm run build" >&2
  echo "  Deploy harus menyertakan folder dist/metronic/ (bukan hanya dist/assets/)." >&2
  exit 1
fi
