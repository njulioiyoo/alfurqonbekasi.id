<script setup lang="ts">
import { RouterView } from "vue-router";
import { storeToRefs } from "pinia";
import LoginView from "../views/LoginView.vue";
import AdminLayout from "./AdminLayout.vue";
import { useAuthStore } from "../stores/auth.js";

const auth = useAuthStore();
const { isAuthenticated } = storeToRefs(auth);
</script>

<template>
  <LoginView v-if="!isAuthenticated" />
  <AdminLayout v-else>
    <RouterView />
  </AdminLayout>
</template>
