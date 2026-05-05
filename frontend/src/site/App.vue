<script setup lang="ts">
/** Satu dev server Vite — CMS di subpath `/admin/`. */
const adminHref = "/admin/";
</script>

<template>
  <main class="wrap">
    <h1>Masjid Alfurqon Bekasi</h1>
    <p class="lead">Situs utama — konten publik akan ditambahkan di folder ini.</p>
    <p class="hint">
      Panel pengurus:
      <a :href="adminHref">Buka CMS</a>
    </p>
  </main>
</template>

<style>
:root {
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
  line-height: 1.5;
}
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f7f9;
}
.wrap {
  max-width: 36rem;
  padding: 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}
h1 {
  margin: 0 0 0.75rem;
  font-size: 1.75rem;
}
.lead {
  margin: 0 0 1.25rem;
  color: #444;
}
.hint {
  margin: 0;
  font-size: 0.95rem;
  color: #666;
}
a {
  color: #2563eb;
}
</style>
