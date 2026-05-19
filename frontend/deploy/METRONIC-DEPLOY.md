# Deploy aset Metronic untuk CMS

## Masalah di server (vendor mentah)

Jika di server struktur seperti ini:

```
metronic/assets/vendors/general/tether/
  src/
  package.json
  gulpfile.js
  (TIDAK ADA dist/)
```

itu **bukan** aset yang dipakai CMS. Itu source code npm, belum di-build.

CMS membutuhkan bundle dari **Metronic v6 theme classic**:

```
metronic/assets/vendors/general/tether/dist/css/tether.css
metronic/assets/vendors/general/jquery/dist/jquery.js
metronic/assets/css/demo2/style.bundle.css
metronic/assets/js/demo2/scripts.bundle.js
```

## Langkah benar (mesin development)

1. Punya folder tema Metronic, misalnya:
   `metronic_v6.0.3/theme/classic/assets`

2. Salin ke proyek:

```bash
export METRONIC_CLASSIC_ASSETS="/path/ke/metronic_v6.0.3/theme/classic/assets"
cd frontend
npm run copy:metronic
npm run build
```

3. Cek lokal:

```bash
ls public/metronic/assets/vendors/general/tether/dist/css/tether.css
```

Harus **ada** file tersebut.

## Upload ke server

Deploy **hasil build**, bukan folder vendor mentah:

```bash
rsync -avz --delete frontend/dist/ user@srv:/var/www/alfurqonbekasi.id/
```

Pastikan di server ada:

- `/var/www/alfurqonbekasi.id/metronic/assets/vendors/general/jquery/dist/jquery.js`
- `/var/www/alfurqonbekasi.id/metronic/assets/vendors/general/tether/dist/css/tether.css`

Path di server mengikuti root situs (bisa `dist/metronic/` jika document root = `dist/`).

## Nginx

Lihat `nginx-spa.example.conf` — `/metronic/` harus `try_files $uri =404`, jangan fallback ke `index.html`.
