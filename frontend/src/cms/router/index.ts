import { createRouter, createWebHistory } from "vue-router";
import GateLayout from "../layouts/GateLayout.vue";
import EmptyRoute from "../views/EmptyRoute.vue";
import DashboardView from "../views/DashboardView.vue";
import UsersAdminView from "../views/UsersAdminView.vue";
import RolesAdminView from "../views/RolesAdminView.vue";
import MasterComingSoonView from "../views/MasterComingSoonView.vue";
import { useAuthStore } from "../stores/auth.js";

export const router = createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    {
      path: "/login",
      redirect: "/",
    },
    {
      path: "/",
      component: GateLayout,
      children: [
        {
          path: "",
          name: "login",
          component: EmptyRoute,
          meta: { guestOnly: true, title: "Masuk" },
        },
        {
          path: "dashboard",
          name: "dashboard",
          component: DashboardView,
          meta: { requiresAuth: true, title: "Dashboard", desc: "Ringkasan CMS" },
        },
        {
          path: "master/users",
          name: "master-users",
          component: UsersAdminView,
          meta: {
            requiresAuth: true,
            title: "User",
            desc: "Master — pengguna sistem",
          },
        },
        {
          path: "master/roles",
          name: "master-roles",
          component: RolesAdminView,
          meta: {
            requiresAuth: true,
            title: "Role",
            desc: "Master — role sistem & jumlah pengguna",
          },
        },
        {
          path: "master/permissions",
          name: "master-permissions",
          component: MasterComingSoonView,
          meta: {
            requiresAuth: true,
            title: "Permission",
            desc: "Master — permission",
            hint: "Penyetelan permission (CASL / ACL) akan dihubungkan ke backend.",
          },
        },
        {
          path: "master/config",
          name: "master-config",
          component: MasterComingSoonView,
          meta: {
            requiresAuth: true,
            title: "Config",
            desc: "Master — konfigurasi",
            hint: "Pengaturan umum aplikasi akan diatur di sini.",
          },
        },
        {
          path: "users",
          redirect: { name: "master-users" },
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.hydrate();
  const token = auth.token;

  if (to.meta.requiresAuth && !token) {
    return { name: "login", query: { redirect: to.fullPath }, replace: true };
  }

  if (token && to.name === "login") {
    const redir = typeof to.query.redirect === "string" ? to.query.redirect : "";
    if (redir.startsWith("/")) {
      return { path: redir, replace: true };
    }
    return { name: "dashboard", replace: true };
  }

  return true;
});
