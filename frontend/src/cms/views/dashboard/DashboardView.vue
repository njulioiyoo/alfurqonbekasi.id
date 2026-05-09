<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getJson } from "../../api/http.js";

type MeResponse = {
  ok: boolean;
  data?: { id: string; email: string; fullName: string | null; role: string };
};

const me = ref<MeResponse["data"] | null>(null);
const meError = ref("");

onMounted(async () => {
  try {
    const json = await getJson<MeResponse>("/auth/me");
    if (json.ok && json.data) {
      me.value = json.data;
    } else {
      meError.value = "Gagal memuat profil";
    }
  } catch {
    meError.value = "Gagal memuat profil";
  }
});
</script>

<template>
  <!-- Susun seperti Metronic demo2/index.html —Begin::Dashboard 2 / Section widgets -->
  <div class="row">
    <div class="col-xl-4">
      <div class="kt-portlet kt-portlet--height-fluid">
        <div class="kt-widget14">
          <div class="kt-widget14__header kt-margin-b-30">
            <h3 class="kt-widget14__title">Ringkasan akun</h3>
            <span class="kt-widget14__desc"> Data dari <code>/auth/me</code> </span>
          </div>
          <div class="kt-widget14__content">
            <p v-if="meError" class="text-danger">{{ meError }}</p>
            <template v-else-if="me">
              <p class="mb-2">
                Selamat datang, <strong>{{ me.fullName || me.email }}</strong>
              </p>
              <p class="kt-font-muted mb-0">Role: {{ me.role }}</p>
            </template>
            <p v-else class="kt-font-muted">Memuat…</p>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-4">
      <div class="kt-portlet kt-portlet--height-fluid">
        <div class="kt-widget14">
          <div class="kt-widget14__header kt-margin-b-30">
            <h3 class="kt-widget14__title">Konten masjid</h3>
            <span class="kt-widget14__desc"> Modul CMS terhubung bertahap </span>
          </div>
          <div class="kt-widget14__content">
            <div class="kt-widget14__legend">
              <div class="kt-widget14__legend">
                <span class="kt-widget14__bullet kt-bg-success"></span>
                <span class="kt-widget14__stats">Autentikasi &amp; pengguna</span>
              </div>
              <div class="kt-widget14__legend">
                <span class="kt-widget14__bullet kt-bg-warning"></span>
                <span class="kt-widget14__stats">Artikel &amp; pengumuman — segera</span>
              </div>
              <div class="kt-widget14__legend">
                <span class="kt-widget14__bullet kt-bg-brand"></span>
                <span class="kt-widget14__stats">Donasi &amp; jadwal — segera</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-4">
      <div class="kt-portlet kt-portlet--height-fluid">
        <div class="kt-widget14">
          <div class="kt-widget14__header">
            <h3 class="kt-widget14__title">Status sistem</h3>
            <span class="kt-widget14__desc"> Panel admin Metronic demo2 </span>
          </div>
          <div class="kt-widget14__content kt-margin-t-20">
            <p class="kt-font-muted mb-0">
              Shell header (brand, topbar, menu horizontal, subheader toolbar) selaras struktur
              <strong>classic/demo2/index.html</strong>. Grafik &amp; widget lanjutan dapat ditambahkan per modul.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
