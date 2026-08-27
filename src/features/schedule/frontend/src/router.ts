import { createRouter, createWebHistory } from "vue-router";
import CalendarView from "./views/CalendarView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/", component: CalendarView, meta: { title: "Schedule" } }],
});
