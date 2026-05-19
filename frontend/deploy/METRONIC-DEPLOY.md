# Deploy frontend Alfurqon

## Metronic (sudah di Git)

Bundle resmi ada di **`frontend/public/metronic/`** (~8k file). Tidak perlu `copy:metronic` di server.

```bash
git pull
cd frontend
npm install
npm run build
sudo rsync -a --delete dist/ /var/www/alfurqonbekasi.id/
```

Jangan timpa `public/metronic` dengan vendor npm mentah. Detail: `public/metronic/BUNDLE.md`.

## Nginx

Lihat `nginx-spa.example.conf` — `/metronic/` harus file statis, bukan fallback SPA.
