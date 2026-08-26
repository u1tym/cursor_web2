import { createRouter, createWebHistory } from "vue-router";
import LoginView from "./views/LoginView.vue";
import MenuView from "./views/MenuView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", component: LoginView },
    { path: "/menu", component: MenuView },
  ],
});
