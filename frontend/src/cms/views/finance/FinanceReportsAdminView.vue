<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getAdminFinanceReportSummary } from "../../api/admin.js";

const loading = ref(false);
const err = ref("");
const from = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
const to = ref(new Date().toISOString().slice(0, 10));
const summary = ref<{
  totalIn: number;
  totalOut: number;
  balance: number;
  byAccount: Array<{ accountName: string; totalIn: number; totalOut: number }>;
}>({
  totalIn: 0,
  totalOut: 0,
  balance: 0,
  byAccount: [],
});

function money(v: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

async function loadSummary(): Promise<void> {
  loading.value = true;
  err.value = "";
  try {
    const json = await getAdminFinanceReportSummary({ from: from.value, to: to.value });
    if (!json.ok || !json.data) {
      err.value = json.error?.message || "Gagal memuat laporan";
      return;
    }
    summary.value = {
      totalIn: Number(json.data.total_in),
      totalOut: Number(json.data.total_out),
      balance: Number(json.data.balance),
      byAccount: json.data.by_account.map((x) => ({
        accountName: x.account_name,
        totalIn: Number(x.total_in),
        totalOut: Number(x.total_out),
      })),
    };
  } catch {
    err.value = "Tidak dapat menghubungi server";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadSummary();
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet">
        <div class="kt-portlet__head">
          <div class="kt-portlet__head-label">
            <h3 class="kt-portlet__head-title">Laporan Keuangan</h3>
          </div>
          <div class="kt-portlet__head-toolbar">
            <div class="form-inline">
              <input v-model="from" type="date" class="form-control form-control-sm mr-2" />
              <input v-model="to" type="date" class="form-control form-control-sm mr-2" />
              <button type="button" class="btn btn-sm btn-brand" @click="loadSummary">Terapkan</button>
            </div>
          </div>
        </div>
        <div class="kt-portlet__body">
          <details class="cms-finance-help-details border rounded bg-white kt-margin-b-20" open>
            <summary class="cms-finance-help-summary px-3 py-2">
              <span class="kt-font-bolder">Petunjuk singkat</span>
              <span class="kt-font-sm kt-font-muted"> — klik untuk menutup atau membuka</span>
            </summary>
            <div class="border-top px-3 py-3 bg-light">
              <ol class="cms-finance-help-list mb-0 pl-3">
                <li>Angka di halaman ini <strong>hanya ringkasan</strong>; tidak ada form input di sini.</li>
                <li>
                  Data diambil dari <strong>transaksi Kas Masjid</strong> (arah Masuk / Keluar) yang
                  <strong>tanggal transaksi</strong> berada dalam rentang yang Anda pilih di kanan atas, lalu klik
                  <strong>Terapkan</strong>.
                </li>
                <li><strong>Pemasukan</strong> = jumlah nominal Masuk; <strong>Pengeluaran</strong> = jumlah Keluar; <strong>Saldo bersih</strong> = selisih keduanya.</li>
                <li>Tabel di bawah memecah total tersebut per <strong>Akun</strong> (jenis pencatatan).</li>
                <li>
                  Untuk menambah atau mengubah data, buka
                  <router-link :to="{ name: 'finance-cash' }" class="kt-link kt-link--brand kt-font-bolder">Kas Masjid</router-link>.
                </li>
              </ol>
            </div>
          </details>
          <div v-if="loading" class="kt-font-muted">Memuat laporan…</div>
          <div v-else-if="err" class="alert alert-outline-danger fade show"><div class="alert-text">{{ err }}</div></div>
          <template v-else>
            <div class="row kt-margin-b-25 cms-finance-summary-row">
              <div class="col-lg-4 kt-margin-b-15 kt-margin-b-lg-0 cms-finance-summary-col">
                <div class="kt-portlet kt-portlet--bordered cms-finance-summary-portlet">
                  <div class="kt-portlet__body cms-finance-summary-body">
                    <div class="kt-widget14 cms-finance-summary-widget">
                      <div class="kt-widget14__header kt-margin-b-15 cms-finance-summary-head">
                        <h3 class="kt-widget14__title kt-font-success mb-0">Pemasukan</h3>
                        <span class="kt-widget14__desc">Jumlah transaksi arah Masuk</span>
                      </div>
                      <div class="kt-widget14__content cms-finance-summary-amount">
                        <span class="kt-font-h2 kt-font-boldest kt-font-success">{{ money(summary.totalIn) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4 kt-margin-b-15 kt-margin-b-lg-0 cms-finance-summary-col">
                <div class="kt-portlet kt-portlet--bordered cms-finance-summary-portlet">
                  <div class="kt-portlet__body cms-finance-summary-body">
                    <div class="kt-widget14 cms-finance-summary-widget">
                      <div class="kt-widget14__header kt-margin-b-15 cms-finance-summary-head">
                        <h3 class="kt-widget14__title kt-font-danger mb-0">Pengeluaran</h3>
                        <span class="kt-widget14__desc">Jumlah transaksi arah Keluar</span>
                      </div>
                      <div class="kt-widget14__content cms-finance-summary-amount">
                        <span class="kt-font-h2 kt-font-boldest kt-font-danger">{{ money(summary.totalOut) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4 kt-margin-b-15 kt-margin-b-lg-0 cms-finance-summary-col">
                <div class="kt-portlet kt-portlet--bordered cms-finance-summary-portlet">
                  <div class="kt-portlet__body cms-finance-summary-body">
                    <div class="kt-widget14 cms-finance-summary-widget">
                      <div class="kt-widget14__header kt-margin-b-15 cms-finance-summary-head">
                        <h3 class="kt-widget14__title kt-font-brand mb-0">Saldo bersih</h3>
                        <span class="kt-widget14__desc">Pemasukan dikurangi pengeluaran</span>
                      </div>
                      <div class="kt-widget14__content cms-finance-summary-amount">
                        <span class="kt-font-h2 kt-font-boldest kt-font-brand">{{ money(summary.balance) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table table-striped table-bordered">
                <thead>
                  <tr><th>Akun</th><th>Pemasukan</th><th>Pengeluaran</th></tr>
                </thead>
                <tbody>
                  <tr v-for="x in summary.byAccount" :key="x.accountName">
                    <td>{{ x.accountName }}</td>
                    <td>{{ money(x.totalIn) }}</td>
                    <td>{{ money(x.totalOut) }}</td>
                  </tr>
                  <tr v-if="summary.byAccount.length === 0"><td colspan="3" class="text-center kt-font-muted">Belum ada data pada rentang tanggal ini.</td></tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cms-finance-help-details > summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
}
.cms-finance-help-details > summary::-webkit-details-marker {
  display: none;
}
.cms-finance-help-list {
  line-height: 1.65;
}
.cms-finance-help-list > li + li {
  margin-top: 0.5rem;
}

/* Samakan tinggi tiga kart ringkasan (kolom flex + isi memenuhi tinggi). */
.cms-finance-summary-row {
  align-items: stretch;
}
.cms-finance-summary-col {
  display: flex;
}
.cms-finance-summary-portlet {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-height: 10.5rem;
  margin-bottom: 0;
}
.cms-finance-summary-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}
.cms-finance-summary-widget {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cms-finance-summary-head {
  flex: 0 0 auto;
  min-height: 3.25rem;
}
.cms-finance-summary-head .kt-widget14__desc {
  display: block;
  line-height: 1.35;
}
.cms-finance-summary-amount {
  flex: 1 1 auto;
  display: flex;
  align-items: flex-end;
  margin-top: auto;
  padding-top: 0.5rem;
}
</style>
