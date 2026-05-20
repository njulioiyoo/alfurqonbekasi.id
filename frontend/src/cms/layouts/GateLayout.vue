<script setup lang="ts">
import { RouterView } from "vue-router";
import { storeToRefs } from "pinia";
import LoginView from "../views/LoginView.vue";
import AdminLayout from "./AdminLayout.vue";
import { useAuthStore } from "../stores/auth.js";

const auth = useAuthStore();
const { isAuthenticated, hydrated } = storeToRefs(auth);
</script>

<template>
  <div v-if="!hydrated" class="cms-boot" role="status" aria-busy="true">
    <div class="cms-boot__spinner" aria-hidden="true" />
    <p class="cms-boot__text">Memuat CMS…</p>
  </div>
  <LoginView v-else-if="!isAuthenticated" />
  <AdminLayout v-else>
    <RouterView />
  </AdminLayout>
</template>

<style scoped>
.cms-boot {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f4f5f8;
  color: #6c7293;
  font-family: system-ui, sans-serif;
}

.cms-boot__spinner {
  width: 2.5rem;
  height: 2.5rem;
  margin-bottom: 1rem;
  border: 3px solid #e2e5ec;
  border-top-color: #5867dd;
  border-radius: 50%;
  animation: cms-boot-spin 0.75s linear infinite;
}

.cms-boot__text {
  margin: 0;
  font-size: 0.95rem;
}

@keyframes cms-boot-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
