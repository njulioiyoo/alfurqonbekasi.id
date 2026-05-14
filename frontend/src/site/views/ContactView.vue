<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getPublicConfig, submitContact, type SiteConfig } from "../api.js";

const B = "/bismillah/assets";

const cfg = ref<SiteConfig | null>(null);

const email = computed(() => cfg.value?.adminEmail || "");
const phone = computed(() => cfg.value?.adminPhone || "");
const websiteUrl = computed(() => cfg.value?.websiteUrl || "");
const mapsEmbedUrl = computed(() => cfg.value?.mapsEmbedUrl || "");
const fullAddress = computed(() => {
  if (!cfg.value) return "";
  const parts = [cfg.value.address, cfg.value.city, cfg.value.province].filter(Boolean);
  if (cfg.value.postalCode) parts.push(cfg.value.postalCode);
  return parts.join(", ");
});

const form = ref({
  name: "",
  email: "",
  phone: "",
  message: "",
});
const formSent = ref(false);
const formError = ref("");
const fieldErrors = ref<{ name?: string; email?: string; phone?: string; message?: string }>({});
const submitting = ref(false);

const messageLen = computed(() => form.value.message.trim().length);

function validateForm(): boolean {
  const errors: { name?: string; email?: string; phone?: string; message?: string } = {};
  const name = form.value.name.trim();
  const email = form.value.email.trim();
  const phone = form.value.phone.trim();
  const message = form.value.message.trim();

  if (name.length < 2) errors.name = "Nama minimal 2 karakter";
  else if (name.length > 120) errors.name = "Nama maksimal 120 karakter";

  if (!email) errors.email = "Email wajib diisi";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Format email tidak valid";

  if (phone && !/^[+]?[\d\s()-]{8,40}$/.test(phone)) {
    errors.phone = "Format telepon tidak valid (min. 8 digit)";
  }

  if (message.length < 10) errors.message = "Pesan minimal 10 karakter";
  else if (message.length > 5000) errors.message = "Pesan maksimal 5000 karakter";

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function onSubmit(): Promise<void> {
  formError.value = "";
  formSent.value = false;
  if (!validateForm()) return;

  submitting.value = true;
  try {
    const json = await submitContact({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim(),
      message: form.value.message.trim(),
    });
    if (!json.ok) {
      formError.value = json.error?.message || "Gagal mengirim pesan. Coba lagi.";
      return;
    }
    formSent.value = true;
    form.value = { name: "", email: "", phone: "", message: "" };
  } catch {
    formError.value = "Tidak dapat menghubungi server.";
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  cfg.value = await getPublicConfig();
});
</script>

<template>
  <section>
    <div class="gap black-layer opc7">
      <div class="fixed-bg2" :style="{ backgroundImage: `url(${B}/images/pg-tp-bg.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <div class="pg-tp-inr">
            <h1>Hubungi Kami</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item active">Kontak</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap">
      <div class="container">
        <div class="sec-tl contact-cont text-center">
          <span class="theme-clr">Kontak</span>
          <h2>Hubungi Kami</h2>
        </div>

        <div class="cnt-frm text-center">
          <form @submit.prevent="onSubmit">
            <div class="row mrg10">
              <div class="col-md-4 col-sm-6 col-lg-4">
                <input v-model="form.name" class="brd-rd5" type="text" placeholder="Nama" required />
              </div>
              <div class="col-md-4 col-sm-6 col-lg-4">
                <input v-model="form.email" class="brd-rd5" type="email" placeholder="Email" required />
              </div>
              <div class="col-md-4 col-sm-12 col-lg-4">
                <input v-model="form.phone" class="brd-rd5" type="text" placeholder="Telepon" />
              </div>
              <div class="col-md-12 col-sm-12 col-lg-12">
                <textarea v-model="form.message" class="brd-rd5" placeholder="Pesan" required></textarea>
              </div>
              <div class="col-md-12 col-sm-12 col-lg-12">
                <button type="submit" class="theme-btn theme-bg brd-rd5" :disabled="submitting">
                  {{ submitting ? "MENGIRIM…" : "KIRIM PESAN" }}
                </button>
              </div>
              <div v-if="formError" class="col-md-12 col-sm-12 col-lg-12 contact-form-error">
                <p>{{ formError }}</p>
              </div>
              <div v-if="formSent" class="col-md-12 col-sm-12 col-lg-12 contact-form-success">
                <p>Terima kasih. Pesan Anda telah kami terima.</p>
              </div>
            </div>
          </form>
        </div>

        <div v-if="mapsEmbedUrl" class="cnt-mp brd-rd5 site-contact-map">
          <iframe :src="mapsEmbedUrl" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>

        <div class="cnt-inf-wrp">
          <div class="row">
            <div class="col-md-7 col-sm-12 col-lg-7">
              <div class="sec-tl">
                <span class="theme-clr">Informasi</span>
                <h3>Detail Kontak</h3>
              </div>
              <ul class="cnt-inf-lst">
                <li v-if="email || websiteUrl">
                  <i class="fas fa-envelope theme-clr"></i>
                  <strong>Email</strong>
                  <a v-if="email" :href="`mailto:${email}`">{{ email }}</a>
                  <a v-if="websiteUrl" :href="websiteUrl" target="_blank" rel="noopener noreferrer">{{ websiteUrl }}</a>
                </li>
                <li v-if="phone">
                  <i class="fas fa-phone theme-clr"></i>
                  <strong>Telepon</strong>
                  <span>{{ phone }}</span>
                </li>
                <li v-if="fullAddress">
                  <i class="fas fa-map-marker-alt theme-clr"></i>
                  <strong>Alamat</strong>
                  <span>{{ fullAddress }}</span>
                </li>
              </ul>
            </div>
            <div class="col-md-5 col-sm-12 col-lg-5">
              <div class="cnt-img brd-rd5">
                <img :src="`${B}/images/resources/cnt-img.jpg`" alt="Kontak masjid" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.site-contact-map {
  overflow: hidden;
  padding: 0;
}

.site-contact-map iframe {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 350px;
  border: 0;
}

.contact-form-error {
  margin-top: 15px;
}

.contact-form-error p {
  margin: 0;
  color: #c0392b;
}

.contact-form-success {
  margin-top: 15px;
}

.contact-form-success p {
  margin: 0;
  color: var(--theme-clr, #0c8f4b);
}

.contact-field-error {
  margin: 6px 0 0;
  font-size: 13px;
  color: #c0392b;
  text-align: left;
}

.contact-field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #888;
  text-align: right;
}

.contact-field-invalid {
  border-color: #c0392b !important;
}
</style>
