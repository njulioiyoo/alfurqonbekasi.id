<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  getPublicConfig,
  getPublicHallAvailability,
  getPublicHalls,
  submitHallBooking,
  type PublicHall,
  type SiteConfig,
} from "../api.js";
import SiteImg from "../components/SiteImg.vue";
import {
  getRecaptchaResponse,
  renderRecaptchaWidget,
  resetRecaptchaWidget,
} from "../utils/site-integrations.js";

const B = "/bismillah/assets";

const EVENT_TYPES = [
  { value: "pernikahan", label: "Pernikahan / walimah" },
  { value: "pengajian", label: "Pengajian / tabligh akbar" },
  { value: "rapat", label: "Rapat / musyawarah" },
  { value: "pelatihan", label: "Pelatihan / workshop" },
  { value: "arisan", label: "Arisan / gathering" },
  { value: "lainnya", label: "Lainnya" },
] as const;

const cfg = ref<SiteConfig | null>(null);
const halls = ref<PublicHall[]>([]);
const hallsLoading = ref(true);
const approvedRanges = ref<{ eventDateStart: string; eventDateEnd: string }[]>([]);

const form = ref({
  hallId: "",
  applicantName: "",
  applicantPhone: "",
  applicantEmail: "",
  organization: "",
  eventType: "pernikahan",
  eventTitle: "",
  eventDateStart: "",
  eventDateEnd: "",
  timeStart: "",
  timeEnd: "",
  expectedAttendees: "",
  notes: "",
});

const formSent = ref(false);
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});
const submitting = ref(false);

const recaptchaSiteKey = computed(() => (cfg.value?.recaptchaSiteKey || "").trim());
const recaptchaEnabled = computed(() => recaptchaSiteKey.value.length > 0);
const recaptchaEl = ref<HTMLElement | null>(null);
let recaptchaWidgetId: number | null = null;

const selectedHall = computed(() => halls.value.find((h) => h.id === form.value.hallId) ?? null);

const hallFallback = (index: number): string =>
  `${B}/images/resources/event-img${(index % 6) + 1}.jpg`;

function hallCoverUrl(hall: PublicHall, index: number): string {
  return hall.coverImageUrl?.trim() || hallFallback(index);
}

async function loadHalls(): Promise<void> {
  hallsLoading.value = true;
  try {
    const json = await getPublicHalls();
    halls.value = json.ok && json.data?.items?.length ? json.data.items : [];
    if (halls.value.length && !form.value.hallId) {
      form.value.hallId = halls.value[0].id;
    }
  } catch {
    halls.value = [];
  } finally {
    hallsLoading.value = false;
  }
}

async function loadAvailability(): Promise<void> {
  if (!form.value.hallId) {
    approvedRanges.value = [];
    return;
  }
  const json = await getPublicHallAvailability(form.value.hallId);
  approvedRanges.value = json.ok && json.data?.approvedRanges ? json.data.approvedRanges : [];
}

watch(
  () => form.value.hallId,
  () => {
    void loadAvailability();
  }
);

async function setupRecaptcha(): Promise<void> {
  if (!recaptchaEnabled.value || !recaptchaEl.value) return;
  try {
    recaptchaWidgetId = await renderRecaptchaWidget(recaptchaEl.value, recaptchaSiteKey.value);
  } catch {
    formError.value = "Gagal memuat reCAPTCHA. Muat ulang halaman.";
  }
}

function validateForm(): boolean {
  const errors: Record<string, string> = {};
  const name = form.value.applicantName.trim();
  const phone = form.value.applicantPhone.trim();
  const email = form.value.applicantEmail.trim();
  const title = form.value.eventTitle.trim();

  if (!form.value.hallId) errors.hallId = "Pilih aula";
  if (name.length < 2) errors.applicantName = "Nama minimal 2 karakter";
  if (!/^[+]?[\d\s()-]{8,40}$/.test(phone)) errors.applicantPhone = "Nomor telepon tidak valid";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.applicantEmail = "Email tidak valid";
  if (title.length < 3) errors.eventTitle = "Judul acara minimal 3 karakter";
  if (!form.value.eventDateStart) errors.eventDateStart = "Tanggal mulai wajib";
  const end = form.value.eventDateEnd.trim() || form.value.eventDateStart;
  if (end < form.value.eventDateStart) errors.eventDateEnd = "Tanggal selesai tidak valid";

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function onSubmit(): Promise<void> {
  formError.value = "";
  formSent.value = false;
  if (!validateForm()) return;

  let recaptchaToken: string | undefined;
  if (recaptchaEnabled.value) {
    if (recaptchaWidgetId === null) {
      formError.value = "reCAPTCHA belum siap.";
      return;
    }
    recaptchaToken = getRecaptchaResponse(recaptchaWidgetId);
    if (!recaptchaToken) {
      formError.value = "Selesaikan verifikasi reCAPTCHA.";
      return;
    }
  }

  submitting.value = true;
  try {
    const attendees = form.value.expectedAttendees.trim();
    const json = await submitHallBooking({
      hallId: form.value.hallId,
      applicantName: form.value.applicantName.trim(),
      applicantPhone: form.value.applicantPhone.trim(),
      applicantEmail: form.value.applicantEmail.trim() || undefined,
      organization: form.value.organization.trim() || undefined,
      eventType: form.value.eventType,
      eventTitle: form.value.eventTitle.trim(),
      eventDateStart: form.value.eventDateStart,
      eventDateEnd: form.value.eventDateEnd.trim() || undefined,
      timeStart: form.value.timeStart.trim() || undefined,
      timeEnd: form.value.timeEnd.trim() || undefined,
      expectedAttendees: attendees ? Number(attendees) : undefined,
      notes: form.value.notes.trim() || undefined,
      recaptchaToken,
    });
    if (!json.ok) {
      formError.value = json.error?.message || "Gagal mengirim pengajuan.";
      if (recaptchaWidgetId !== null) resetRecaptchaWidget(recaptchaWidgetId);
      return;
    }
    formSent.value = true;
    form.value.applicantName = "";
    form.value.applicantPhone = "";
    form.value.applicantEmail = "";
    form.value.organization = "";
    form.value.eventTitle = "";
    form.value.eventDateStart = "";
    form.value.eventDateEnd = "";
    form.value.timeStart = "";
    form.value.timeEnd = "";
    form.value.expectedAttendees = "";
    form.value.notes = "";
    if (recaptchaWidgetId !== null) resetRecaptchaWidget(recaptchaWidgetId);
  } catch {
    formError.value = "Tidak dapat menghubungi server.";
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  cfg.value = await getPublicConfig();
  await loadHalls();
  await loadAvailability();
  await nextTick();
  await setupRecaptcha();
});
</script>

<template>
  <section>
    <div class="gap black-layer opc7">
      <div class="fixed-bg2" :style="{ backgroundImage: `url(${B}/images/pg-tp-bg.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <div class="pg-tp-inr">
            <h1>Penyewaan Aula</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item active">Penyewaan Aula</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap">
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Fasilitas Masjid</span>
          <h2>Form Pengajuan Sewa Aula / Gedung</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
          <p class="kt-margin-t-15 site-hall-intro">
            Isi formulir di bawah untuk mengajukan penyewaan aula. Pengurus masjid akan meninjau ketersediaan tanggal
            dan menghubungi Anda. Pengajuan di web <strong>bukan konfirmasi final</strong>.
          </p>
        </div>

        <div v-if="hallsLoading" class="text-center site-hall-status">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat daftar aula…</p>
        </div>
        <div v-else-if="halls.length" class="row mrg10 site-hall-cards">
          <div v-for="(hall, idx) in halls" :key="hall.id" class="col-md-6 col-lg-6 site-hall-cards__col">
            <div
              class="event-bx2 brd-rd5 site-hall-card"
              :class="{ 'site-hall-card--active': form.hallId === hall.id }"
              @click="form.hallId = hall.id"
            >
              <div class="event-thmb site-hall-card__thumb">
                <SiteImg
                  :src="hallCoverUrl(hall, idx)"
                  :fallback="hallFallback(idx)"
                  :alt="hall.name"
                  placeholder-title="Foto aula"
                />
              </div>
              <div class="event-inf site-hall-card__body">
                <h5>{{ hall.name }}</h5>
                <p v-if="hall.capacity" class="site-hall-card__meta mb-1">
                  <i class="fas fa-users theme-clr"></i> Kapasitas ± {{ hall.capacity }} orang
                </p>
                <p v-else class="site-hall-card__meta site-hall-card__meta--placeholder" aria-hidden="true">&nbsp;</p>
                <p v-if="hall.description" class="site-hall-card__desc">{{ hall.description }}</p>
                <p v-else class="site-hall-card__desc site-hall-card__desc--placeholder" aria-hidden="true">&nbsp;</p>
                <ul v-if="hall.amenities?.length" class="site-hall-amenities">
                  <li v-for="a in hall.amenities" :key="a">{{ a }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div v-if="approvedRanges.length" class="alert alert-light site-hall-availability" role="status">
          <strong>Tanggal sudah terpakai (disetujui):</strong>
          <span v-for="(r, i) in approvedRanges" :key="i" class="site-hall-availability__chip">
            {{ r.eventDateStart }}<template v-if="r.eventDateEnd !== r.eventDateStart"> – {{ r.eventDateEnd }}</template>
          </span>
        </div>

        <div class="cnt-frm text-center site-hall-form">
          <form @submit.prevent="onSubmit">
            <div class="row mrg10">
              <div class="col-md-6">
                <label class="site-form-label">Pilih aula</label>
                <select v-model="form.hallId" class="form-control brd-rd5" required>
                  <option v-for="h in halls" :key="h.id" :value="h.id">{{ h.name }}</option>
                </select>
                <p v-if="fieldErrors.hallId" class="site-field-error">{{ fieldErrors.hallId }}</p>
              </div>
              <div class="col-md-6">
                <label class="site-form-label">Jenis acara</label>
                <select v-model="form.eventType" class="form-control brd-rd5">
                  <option v-for="t in EVENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <div class="col-md-12">
                <label class="site-form-label">Judul acara</label>
                <input v-model="form.eventTitle" type="text" class="brd-rd5" placeholder="Contoh: Walimah Ahmad & Siti" required />
                <p v-if="fieldErrors.eventTitle" class="site-field-error">{{ fieldErrors.eventTitle }}</p>
              </div>
              <div class="col-md-4">
                <label class="site-form-label">Tanggal mulai</label>
                <input v-model="form.eventDateStart" type="date" class="brd-rd5" required />
                <p v-if="fieldErrors.eventDateStart" class="site-field-error">{{ fieldErrors.eventDateStart }}</p>
              </div>
              <div class="col-md-4">
                <label class="site-form-label">Tanggal selesai (opsional)</label>
                <input v-model="form.eventDateEnd" type="date" class="brd-rd5" />
                <p v-if="fieldErrors.eventDateEnd" class="site-field-error">{{ fieldErrors.eventDateEnd }}</p>
              </div>
              <div class="col-md-2">
                <label class="site-form-label">Jam mulai</label>
                <input v-model="form.timeStart" type="time" class="brd-rd5" />
              </div>
              <div class="col-md-2">
                <label class="site-form-label">Jam selesai</label>
                <input v-model="form.timeEnd" type="time" class="brd-rd5" />
              </div>
              <div class="col-md-4">
                <label class="site-form-label">Nama pemohon</label>
                <input v-model="form.applicantName" type="text" class="brd-rd5" placeholder="Nama lengkap" required />
                <p v-if="fieldErrors.applicantName" class="site-field-error">{{ fieldErrors.applicantName }}</p>
              </div>
              <div class="col-md-4">
                <label class="site-form-label">Nomor WhatsApp / telepon</label>
                <input v-model="form.applicantPhone" type="text" class="brd-rd5" placeholder="08xxxxxxxxxx" required />
                <p v-if="fieldErrors.applicantPhone" class="site-field-error">{{ fieldErrors.applicantPhone }}</p>
              </div>
              <div class="col-md-4">
                <label class="site-form-label">Email (opsional)</label>
                <input v-model="form.applicantEmail" type="email" class="brd-rd5" placeholder="email@contoh.com" />
                <p v-if="fieldErrors.applicantEmail" class="site-field-error">{{ fieldErrors.applicantEmail }}</p>
              </div>
              <div class="col-md-6">
                <label class="site-form-label">Organisasi / keluarga (opsional)</label>
                <input v-model="form.organization" type="text" class="brd-rd5" placeholder="RT/RW, panitia, dll." />
              </div>
              <div class="col-md-6">
                <label class="site-form-label">Perkiraan jumlah tamu</label>
                <input v-model="form.expectedAttendees" type="number" min="1" class="brd-rd5" placeholder="Contoh: 200" />
              </div>
              <div class="col-md-12">
                <label class="site-form-label">Catatan tambahan</label>
                <textarea v-model="form.notes" class="brd-rd5" rows="4" placeholder="Kebutuhan khusus, perlengkapan, dll." />
              </div>
              <div v-if="recaptchaEnabled" class="col-md-12 contact-recaptcha-wrap">
                <div ref="recaptchaEl" class="g-recaptcha-inline"></div>
              </div>
              <div class="col-md-12">
                <button type="submit" class="theme-btn theme-bg brd-rd5" :disabled="submitting || !halls.length">
                  {{ submitting ? "MENGIRIM…" : "KIRIM PENGAJUAN" }}
                </button>
              </div>
              <div v-if="formError" class="col-md-12 contact-form-error"><p>{{ formError }}</p></div>
              <div v-if="formSent" class="col-md-12 contact-form-success">
                <p>
                  Terima kasih. Pengajuan Anda telah kami terima. Tim masjid akan menghubungi Anda setelah peninjauan
                  jadwal.
                </p>
              </div>
            </div>
          </form>
        </div>

        <div class="site-hall-rules kt-margin-t-20">
          <h4 class="theme-clr">Ketentuan singkat</h4>
          <ul>
            <li>Pengajuan sewa bukan jaminan tanggal — menunggu persetujuan pengurus.</li>
            <li>Acara wajib menjaga ketertiban, kebersihan, dan tidak mengganggu ibadah di masjid.</li>
            <li>Biaya sewa (jika ada) akan dikonfirmasi oleh pengurus saat persetujuan.</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.site-hall-intro {
  max-width: 640px;
  margin: 0 auto;
  color: #666;
}

.site-hall-cards {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  margin-bottom: 48px;
}

.site-hall-cards__col {
  display: flex;
}

.site-hall-card {
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
  border: 2px solid transparent;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.site-hall-card--active {
  border-color: var(--theme-color, #c9a227);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.site-hall-card__thumb {
  height: 220px;
  flex-shrink: 0;
  overflow: hidden;
}

.site-hall-card__thumb :deep(.site-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  min-height: 0;
}

.site-hall-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 220px;
}

.site-hall-card__meta {
  flex-shrink: 0;
  min-height: 1.5rem;
}

.site-hall-card__meta--placeholder {
  visibility: hidden;
}

.site-hall-card__desc {
  flex: 1;
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  min-height: calc(1.5em * 4);
}

.site-hall-card__desc--placeholder {
  visibility: hidden;
}

.site-hall-amenities {
  list-style: none;
  padding: 0;
  margin: auto 0 0;
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 56px;
  overflow: hidden;
}

.site-hall-amenities li {
  background: #f3f4f6;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.site-hall-availability {
  font-size: 14px;
  margin-bottom: 40px;
}

.site-hall-availability__chip {
  display: inline-block;
  margin: 4px 8px 0 0;
  padding: 2px 8px;
  background: #fff3cd;
  border-radius: 4px;
}

.site-hall-form {
  padding-top: 48px;
  border-top: 1px solid #e8e8e8;
}

.site-form-label {
  display: block;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.site-field-error {
  color: #c0392b;
  font-size: 12px;
  text-align: left;
  margin: 4px 0 0;
}

.site-hall-rules ul {
  padding-left: 1.2rem;
  color: #555;
}

.site-hall-status {
  padding: 24px;
  margin-bottom: 48px;
  color: #666;
}
</style>
