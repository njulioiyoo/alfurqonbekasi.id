#!/bin/bash
set -euo pipefail

ADMIN_BLOCK='    location /admin/ {
        try_files $uri $uri/ /admin/index.html;
    }
'

for conf in /etc/nginx/conf.d/dev_conf /etc/nginx/conf.d/alfurqon_id.conf; do
  [[ -f "$conf" ]] || continue
  if grep -q 'location /admin/' "$conf"; then
    echo "already ok: $conf"
    continue
  fi
  cp "$conf" "${conf}.bak-$(date +%Y%m%d%H%M%S)"
  awk -v block="$ADMIN_BLOCK" '
    /^[[:space:]]*location \/ \{/ && !done {
      print block
      done=1
    }
    { print }
  ' "$conf" > "${conf}.new"
  mv "${conf}.new" "$conf"
  echo "patched: $conf"
done

nginx -t
systemctl reload nginx
echo NGINX_OK
