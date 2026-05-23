#!/bin/sh
# Patch nginx vhost Alfurqon di server (jalankan sebagai root di server).
set -e
SNIPPET_SRC="${1:-/tmp/nginx-alfurqon-spa.snippet.conf}"
SNIPPET_DST="/etc/nginx/snippets/alfurqon-spa.conf"
MARKER="# alfurqon-spa-locations"

cp "$SNIPPET_SRC" "$SNIPPET_DST"

for conf in /etc/nginx/conf.d/dev_conf /etc/nginx/conf.d/alfurqon_id.conf; do
  [ -f "$conf" ] || continue
  if grep -q "$MARKER" "$conf"; then
    echo "skip (sudah dipatch): $conf"
    continue
  fi
  cp "$conf" "${conf}.bak.$(date +%Y%m%d%H%M%S)"
  awk -v marker="$MARKER" -v snippet="include /etc/nginx/snippets/alfurqon-spa.conf;" '
    BEGIN { skip=0 }
    $0 ~ marker { skip=1; print marker; print snippet; next }
    skip && /^[[:space:]]*location \// { skip=0 }
    skip && /^[[:space:]]*location \/metronic/ { skip=0 }
    skip && /^[[:space:]]*location \/api/ { skip=0; print; next }
    skip { next }
    { print }
  ' "$conf" > "${conf}.tmp" && mv "${conf}.tmp" "$conf"
  # Jika awk tidak menghapus block lama (variasi indent), hapus location / sederhana manual
  sed -i '/^[[:space:]]*location \/ {$/,/^[[:space:]]*}$/{
    /try_files \$uri \$uri\/ \/index.html;/d
  }' "$conf" 2>/dev/null || true
  if ! grep -q "$MARKER" "$conf"; then
    sed -i "/index index.html;/a\\
    $MARKER\\
    include /etc/nginx/snippets/alfurqon-spa.conf;
" "$conf"
  fi
  echo "patched: $conf"
done

nginx -t
systemctl reload nginx
echo "OK: nginx reloaded"
