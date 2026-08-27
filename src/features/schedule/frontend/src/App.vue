<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterView } from "vue-router";
import { AuthError, getSettings, type Settings } from "./api";

const settings = ref<Settings | null>(null);
const loadError = ref("");
const forbidden = ref(false);

function goMenu(): void {
  if (settings.value) {
    window.location.href = settings.value.menu_url;
  }
}

function onAuthError(error: unknown): void {
  if (error instanceof AuthError && error.status === 401 && settings.value) {
    window.location.href = settings.value.login_url;
    return;
  }
  if (error instanceof AuthError && error.status === 403) {
    forbidden.value = true;
  }
}

onMounted(async () => {
  try {
    settings.value = await getSettings();
  } catch {
    loadError.value = "サーバエラーです";
  }
});
</script>

<template>
  <div v-if="loadError" class="forbidden">
    <p class="msg-error">{{ loadError }}</p>
  </div>
  <div v-else-if="forbidden" class="shell">
    <header class="header">
      <button v-if="settings" class="btn-text" type="button" @click="goMenu">
        <img v-if="settings.icon_back" class="header-icon" :src="settings.icon_back" alt="" />
        戻る
      </button>
      <h1 class="header-title">カレンダー</h1>
      <img v-if="settings?.icon_system" class="header-icon" :src="settings.icon_system" alt="" />
    </header>
    <nav class="nav" aria-label="ナビ">
      <button class="nav-item is-current" type="button">カレンダー</button>
    </nav>
    <main class="content forbidden">
      <p>この機能を使えません</p>
      <button v-if="settings" class="btn-secondary" type="button" @click="goMenu">戻る</button>
    </main>
  </div>
  <div v-else-if="settings" class="shell">
    <header class="header">
      <button class="btn-text" type="button" @click="goMenu">
        <img v-if="settings.icon_back" class="header-icon" :src="settings.icon_back" alt="" />
        戻る
      </button>
      <h1 class="header-title">カレンダー</h1>
      <img v-if="settings.icon_system" class="header-icon" :src="settings.icon_system" alt="" />
    </header>
    <nav class="nav" aria-label="ナビ">
      <button class="nav-item is-current" type="button">カレンダー</button>
    </nav>
    <main class="content">
      <RouterView @auth-error="onAuthError" />
    </main>
  </div>
</template>
