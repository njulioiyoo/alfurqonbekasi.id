<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LOGIN_STYLESHEETS } from "../metronic/loginAssets.js";
import { injectInlineScript, injectStylesheet, removeByMetronicAttr } from "../metronic/inject.js";
import { KT_APP_OPTIONS_DEMO1 } from "../metronic/loginKtOptions.js";
import { metronicAsset } from "../metronic/urls.js";
import { loginRequest } from "../api/auth.js";
import { useAuthStore } from "../stores/auth.js";

/** Persis pola login-5.html: hanya `kt-login--signin` ↔ `kt-login--forgot` (tanpa signup). */
type LoginMode = "signin" | "forgot";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const mode = ref<LoginMode>("signin");
const username = ref("");
const password = ref("");
/** Hanya UI — menyamai login-5.html; tidak mengirim ke API. */
const rememberMe = ref(false);
const loading = ref(false);
const errorMsg = ref("");
const forgotEmail = ref("");

const bgUrl = computed(() => metronicAsset("media/bg/bg-3.jpg"));
const logoUrl = computed(() => metronicAsset("media/logos/logo-5.png"));

const loginRootClass = computed(() => ({
  "kt-login--signin": mode.value === "signin",
  "kt-login--forgot": mode.value === "forgot",
}));

function mountMetronic(): void {
  injectInlineScript(KT_APP_OPTIONS_DEMO1, "login-kt-options");
  LOGIN_STYLESHEETS.forEach((href, i) => {
    injectStylesheet(href, `login-css-${i}`);
  });
}

function unmountMetronic(): void {
  removeByMetronicAttr("login-kt-options");
  document.querySelectorAll('[data-metronic^="login-css-"]').forEach((el) => el.remove());
}

onMounted(() => {
  document.documentElement.classList.add("route-login");
  document.body.className =
    "route-login kt-quick-panel--right kt-demo-panel--right kt-offcanvas-panel--right kt-header--fixed kt-header-mobile--fixed kt-subheader--fixed kt-subheader--enabled kt-subheader--solid kt-aside--enabled kt-aside--fixed";
  mountMetronic();
});

onUnmounted(() => {
  document.documentElement.classList.remove("route-login");
  document.body.classList.remove("route-login");
  document.body.className = "";
  unmountMetronic();
});

function showSignin(): void {
  mode.value = "signin";
  errorMsg.value = "";
}

function showForgot(e: Event): void {
  e.preventDefault();
  mode.value = "forgot";
  errorMsg.value = "";
}

async function onSubmitSignin(): Promise<void> {
  errorMsg.value = "";
  loading.value = true;
  try {
    const email = username.value.trim();
    const res = await loginRequest(email, password.value);
    if (!res.ok || !res.data) {
      errorMsg.value = res.error?.message || "Incorrect username or password. Please try again.";
      return;
    }
    auth.login(res.data.user);
    const redir = typeof route.query.redirect === "string" ? route.query.redirect : "";
    await router.replace(redir.startsWith("/") ? redir : { name: "dashboard" });
  } catch {
    errorMsg.value = "Tidak dapat menghubungi server. Periksa jaringan atau URL API.";
  } finally {
    loading.value = false;
  }
}

function onForgotSubmit(e: Event): void {
  e.preventDefault();
  alert(
    "Reset password via email belum diaktifkan. Hubungi administrator CMS atau gunakan akun yang telah dibuat oleh superadmin."
  );
  showSignin();
}
</script>

<template>
  <!-- login-shell + route-login (CSS global) mengisi tinggi viewport -->
  <div class="kt-grid kt-grid--ver kt-grid--root login-shell">
    <div
      id="kt_login"
      class="kt-grid kt-grid--hor kt-grid--root kt-login kt-login--v5"
      :class="loginRootClass"
    >
      <div
        class="kt-grid__item kt-grid__item--fluid kt-grid kt-grid--desktop kt-grid--ver-desktop kt-grid--hor-tablet-and-mobile"
        :style="{ backgroundImage: `url(${bgUrl})` }"
      >
        <div class="kt-login__left">
          <div class="kt-login__wrapper">
            <div class="kt-login__content">
              <a class="kt-login__logo" href="#">
                <img :src="logoUrl" alt="" />
              </a>
              <h3 class="kt-login__title">CMS Masjid Alfurqon Bekasi</h3>
              <span class="kt-login__desc">
                Akses terbatas untuk pengurus. Akun dibuat oleh administrator.
              </span>
              <!-- Ruang vertikal sama seperti tombol “Get An Account” di login-5.html (tanpa fitur signup). -->
              <div class="kt-login__actions" aria-hidden="true"></div>
            </div>
          </div>
        </div>
        <div class="kt-login__divider">
          <div></div>
        </div>
        <div class="kt-login__right">
          <div class="kt-login__wrapper">
            <div class="kt-login__signin">
              <div class="kt-login__head">
                <h3 class="kt-login__title">Login To Your Account</h3>
              </div>
              <div class="kt-login__form">
                <form class="kt-form" action="" @submit.prevent="onSubmitSignin">
                  <div
                    v-if="errorMsg"
                    class="form-group kt-login__form-error"
                  >
                    <div class="kt-alert kt-alert--outline alert alert-danger" role="alert">
                      <span>{{ errorMsg }}</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <input
                      v-model="username"
                      class="form-control"
                      type="text"
                      placeholder="Username"
                      name="username"
                      autocomplete="off"
                    />
                  </div>
                  <div class="form-group">
                    <input
                      v-model="password"
                      class="form-control form-control-last"
                      type="password"
                      placeholder="Password"
                      name="password"
                      autocomplete="off"
                    />
                  </div>
                  <div class="row kt-login__extra">
                    <div class="col kt-align-left">
                      <label class="kt-checkbox">
                        <input v-model="rememberMe" type="checkbox" name="remember" />
                        Remember me
                        <span></span>
                      </label>
                    </div>
                    <div class="col kt-align-right">
                      <a href="javascript:;" id="kt_login_forgot" class="kt-link" @click="showForgot">
                        Forget Password ?
                      </a>
                    </div>
                  </div>
                  <div class="kt-login__actions">
                    <button id="kt_login_signin_submit" type="submit" class="btn btn-brand btn-pill btn-elevate" :disabled="loading">
                      Sign In
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div class="kt-login__forgot">
              <div class="kt-login__head">
                <h3 class="kt-login__title">Forgotten Password ?</h3>
                <div class="kt-login__desc">Enter your email to reset your password:</div>
              </div>
              <div class="kt-login__form">
                <form class="kt-form" action="" @submit.prevent="onForgotSubmit">
                  <div class="form-group">
                    <input
                      id="kt_email"
                      v-model="forgotEmail"
                      class="form-control"
                      type="text"
                      placeholder="Email"
                      name="email"
                      autocomplete="off"
                    />
                  </div>
                  <div class="kt-login__actions">
                    <button id="kt_login_forgot_submit" type="submit" class="btn btn-brand btn-pill btn-elevate">Request</button>
                    <button id="kt_login_forgot_cancel" type="button" class="btn btn-outline-brand btn-pill" @click="showSignin">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
