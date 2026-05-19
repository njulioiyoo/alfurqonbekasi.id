# Metronic v6 Classic — bundle CMS (di Git)

Folder ini **satu-satunya** sumber aset Metronic untuk Alfurqon CMS & login.

## Struktur

```
public/metronic/
  BUNDLE.md          ← Anda di sini
  assets/            ← isi resmi theme/classic/assets (ada folder dist/ di vendor)
    vendors/general/jquery/dist/jquery.js
    css/demo2/style.bundle.css
    js/demo2/scripts.bundle.js
    …
```

URL di browser: `/metronic/assets/...`

## Jangan

- Mengganti isi `assets/vendors/` dengan paket npm mentah (tanpa `dist/`).
- Upload folder `vendors` dari GitHub/npm ke server secara terpisah.

## Build & deploy

```bash
cd frontend
npm install
npm run build          # cek bundle + vite build → dist/metronic/
# deploy isi dist/ ke document root web
```

Di server cukup: **`git pull`** lalu **`npm run build`** (aset sudah ikut repo).

## Perbarui bundle (maintainer, jarang)

Hanya jika upgrade tema Metronic:

```bash
export METRONIC_CLASSIC_ASSETS=/path/ke/metronic_v6/theme/classic/assets
npm run copy:metronic
git add public/metronic
git commit -m "chore: refresh Metronic classic bundle"
```

Sumber: Metronic v6.0.3 `theme/classic/assets`.
