<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  AuthError,
  createCategory,
  createSchedule,
  createUserHoliday,
  deleteCategory,
  deleteSchedule,
  deleteUserHoliday,
  getAllUserHolidays,
  getCategories,
  getHolidays,
  getPreferences,
  getSchedules,
  getUserHolidays,
  savePreferences,
  updateCategory,
  updateCompletion,
  updateSchedule,
  updateUserHoliday,
  type CategoryItem,
  type HolidayItem,
  type Preferences,
  type ScheduleItem,
  type SchedulePayload,
  type UserHolidayItem,
} from "../api";
import {
  addMonths,
  dateTone,
  monthCells,
  monthLabel,
  overlapsDay,
  toIso,
  weekdayHeaders,
  type DayCell,
} from "../calendar";

const emit = defineEmits<{ "auth-error": [unknown] }>();

const PC_VISIBLE = 3;

const busy = ref(true);
const error = ref("");
const success = ref("");
const isMobile = ref(false);
const year = ref(new Date().getFullYear());
const monthIndex = ref(new Date().getMonth());
const selectedIso = ref<string | null>(null);
const leftoverIso = ref<string | null>(null);
const categoryPanel = ref(false);
const holidayPanel = ref(false);

const prefs = ref<Preferences>({
  week_starts_on: "sunday",
  show_deleted: false,
  hidden_category_ids: [],
});
const categories = ref<CategoryItem[]>([]);
const schedules = ref<ScheduleItem[]>([]);
const nationalHolidays = ref<HolidayItem[]>([]);
const userHolidays = ref<UserHolidayItem[]>([]);
const allUserHolidays = ref<UserHolidayItem[]>([]);

const scheduleOpen = ref(false);
const categoryOpen = ref(false);
const holidayOpen = ref(false);
const confirmKind = ref<"schedule" | "category" | "holiday" | null>(null);
const confirmId = ref<number | null>(null);
const formError = ref("");

const scheduleForm = ref({
  id: null as number | null,
  kind: "event" as "event" | "todo",
  granularity: "day" as "day" | "time",
  title: "",
  start_date: "",
  end_date: "",
  start_time: "09:00",
  end_time: "10:00",
  category_id: null as number | null,
  location: "",
  detail: "",
  is_completed: false,
});
const categoryForm = ref({ id: null as number | null, name: "", color: "#4DA3FF" });
const holidayForm = ref({ id: null as number | null, holiday_date: "", name: "" });

let successTimer = 0;
let media: MediaQueryList | null = null;

function onMedia(): void {
  if (media) {
    isMobile.value = media.matches;
  }
}

function flash(message: string): void {
  success.value = message;
  window.clearTimeout(successTimer);
  successTimer = window.setTimeout(() => {
    success.value = "";
  }, 3000);
}

function handle(errorValue: unknown): boolean {
  if (errorValue instanceof AuthError) {
    emit("auth-error", errorValue);
    return true;
  }
  return false;
}

const cells = computed(() => monthCells(year.value, monthIndex.value, prefs.value.week_starts_on));
const headers = computed(() => weekdayHeaders(prefs.value.week_starts_on));
const titleText = computed(() => monthLabel(year.value, monthIndex.value));
const rangeStart = computed(() => cells.value[0]?.iso ?? "");
const rangeEnd = computed(() => cells.value[cells.value.length - 1]?.iso ?? "");

const listedCategories = computed(() =>
  categories.value.filter((item) => prefs.value.show_deleted || !item.is_deleted),
);
const activeCategories = computed(() => categories.value.filter((item) => !item.is_deleted));

function isHidden(categoryId: number): boolean {
  return prefs.value.hidden_category_ids.includes(categoryId);
}

function isVisibleSchedule(item: ScheduleItem): boolean {
  if (isHidden(item.category_id)) {
    return false;
  }
  const category = categories.value.find((row) => row.id === item.category_id);
  if (category?.is_deleted && !prefs.value.show_deleted) {
    return false;
  }
  return true;
}

function daySchedules(iso: string): ScheduleItem[] {
  return schedules.value.filter((item) => overlapsDay(item.start_date, item.end_date, iso) && isVisibleSchedule(item));
}

function holidayNames(iso: string): string[] {
  const names: string[] = [];
  for (const item of nationalHolidays.value) {
    if (item.date === iso) {
      names.push(item.name);
    }
  }
  for (const item of userHolidays.value) {
    if (item.holiday_date === iso) {
      names.push(item.name);
    }
  }
  return names;
}

function isHoliday(iso: string): boolean {
  return holidayNames(iso).length > 0;
}

function tone(cell: DayCell): "danger" | "primary" | "normal" {
  return dateTone(cell.weekday, isHoliday(cell.iso));
}

function categoryColor(categoryId: number): string {
  return categories.value.find((item) => item.id === categoryId)?.color ?? "#4DA3FF";
}

function pcLabel(item: ScheduleItem, iso: string): string {
  if (item.granularity === "time" && item.start_time && item.start_date === iso) {
    return `${item.start_time} ${item.title}`;
  }
  return item.title;
}

function mobileLabel(item: ScheduleItem, iso: string): string {
  if (item.granularity === "time" && item.start_time && item.end_time && item.start_date === iso) {
    return `${item.start_time} ～ ${item.end_time} ${item.title}`;
  }
  return item.title;
}

function dotsFor(iso: string): string[] {
  const seen: number[] = [];
  const colors: string[] = [];
  for (const item of daySchedules(iso)) {
    if (seen.includes(item.category_id)) {
      continue;
    }
    seen.push(item.category_id);
    colors.push(categoryColor(item.category_id));
  }
  return colors;
}

async function loadAll(): Promise<void> {
  busy.value = true;
  error.value = "";
  try {
    prefs.value = await getPreferences();
    categories.value = await getCategories(true);
    allUserHolidays.value = await getAllUserHolidays();
    await loadMonth();
  } catch (caught) {
    if (!handle(caught)) {
      error.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

async function loadMonth(): Promise<void> {
  const start = rangeStart.value;
  const end = rangeEnd.value;
  if (start === "" || end === "") {
    return;
  }
  schedules.value = await getSchedules(start, end);
  nationalHolidays.value = await getHolidays(start, end);
  userHolidays.value = await getUserHolidays(start, end);
}

async function persistPrefs(next: Preferences): Promise<void> {
  const saved = await savePreferences(next);
  if (saved === "invalid") {
    error.value = "入力が不正です";
    return;
  }
  prefs.value = saved;
}

async function changeWeek(value: string): Promise<void> {
  if (value !== "sunday" && value !== "monday") {
    return;
  }
  busy.value = true;
  try {
    await persistPrefs({ ...prefs.value, week_starts_on: value });
    await loadMonth();
  } catch (caught) {
    if (!handle(caught)) {
      error.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

async function toggleHiddenCategory(categoryId: number): Promise<void> {
  const current = new Set(prefs.value.hidden_category_ids);
  if (current.has(categoryId)) {
    current.delete(categoryId);
  } else {
    current.add(categoryId);
  }
  busy.value = true;
  try {
    await persistPrefs({ ...prefs.value, hidden_category_ids: [...current] });
  } catch (caught) {
    if (!handle(caught)) {
      error.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

async function toggleShowDeleted(): Promise<void> {
  busy.value = true;
  try {
    await persistPrefs({ ...prefs.value, show_deleted: !prefs.value.show_deleted });
    categories.value = await getCategories(true);
  } catch (caught) {
    if (!handle(caught)) {
      error.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

function shiftMonth(delta: number): void {
  const next = addMonths(year.value, monthIndex.value, delta);
  year.value = next.year;
  monthIndex.value = next.monthIndex;
  void reloadMonth();
}

function goToday(): void {
  const now = new Date();
  year.value = now.getFullYear();
  monthIndex.value = now.getMonth();
  if (isMobile.value) {
    selectedIso.value = toIso(now);
  }
  void reloadMonth();
}

async function reloadMonth(): Promise<void> {
  busy.value = true;
  error.value = "";
  try {
    await loadMonth();
  } catch (caught) {
    if (!handle(caught)) {
      error.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

function openAdd(iso: string): void {
  const first = activeCategories.value[0];
  scheduleForm.value = {
    id: null,
    kind: "event",
    granularity: "day",
    title: "",
    start_date: iso,
    end_date: iso,
    start_time: "09:00",
    end_time: "10:00",
    category_id: first ? first.id : null,
    location: "",
    detail: "",
    is_completed: false,
  };
  formError.value = "";
  scheduleOpen.value = true;
}

function openEdit(item: ScheduleItem): void {
  leftoverIso.value = null;
  scheduleForm.value = {
    id: item.id,
    kind: item.kind,
    granularity: item.granularity,
    title: item.title,
    start_date: item.start_date,
    end_date: item.end_date,
    start_time: item.start_time ?? "09:00",
    end_time: item.end_time ?? "10:00",
    category_id: activeCategories.value.some((row) => row.id === item.category_id)
      ? item.category_id
      : null,
    location: item.location ?? "",
    detail: item.detail ?? "",
    is_completed: item.is_completed === true,
  };
  formError.value = "";
  scheduleOpen.value = true;
}

function onCellClick(iso: string): void {
  if (isMobile.value) {
    selectedIso.value = iso;
    return;
  }
  openAdd(iso);
}

function openFab(): void {
  openAdd(selectedIso.value ?? toIso(new Date()));
}

function rangeValid(): boolean {
  const form = scheduleForm.value;
  if (form.end_date < form.start_date) {
    return false;
  }
  if (form.end_date > form.start_date || form.granularity === "day") {
    return true;
  }
  return form.end_time >= form.start_time;
}

function payload(): SchedulePayload | null {
  const form = scheduleForm.value;
  if (form.title.trim() === "") {
    return null;
  }
  if (form.category_id === null) {
    formError.value = "カテゴリを追加してください";
    return null;
  }
  if (!rangeValid()) {
    return null;
  }
  const body: SchedulePayload = {
    title: form.title.trim(),
    kind: form.kind,
    granularity: form.granularity,
    start_date: form.start_date,
    end_date: form.end_date,
    category_id: form.category_id,
  };
  if (form.location.trim() !== "") {
    body.location = form.location.trim();
  }
  if (form.detail.trim() !== "") {
    body.detail = form.detail.trim();
  }
  if (form.granularity === "time") {
    body.start_time = form.start_time.slice(0, 5);
    body.end_time = form.end_time.slice(0, 5);
  }
  return body;
}

async function saveSchedule(): Promise<void> {
  const body = payload();
  if (body === null) {
    return;
  }
  busy.value = true;
  formError.value = "";
  try {
    const form = scheduleForm.value;
    const result =
      form.id === null ? await createSchedule(body) : await updateSchedule(form.id, body);
    if (result === "invalid") {
      formError.value = "入力が不正です";
      return;
    }
    if (result === "missing") {
      formError.value = "対象がありません";
      return;
    }
    if (form.id !== null && form.kind === "todo" && result.is_completed !== form.is_completed) {
      const completion = await updateCompletion(form.id, form.is_completed);
      if (completion === "missing" || completion === "conflict") {
        formError.value = "保存できませんでした";
        return;
      }
    }
    scheduleOpen.value = false;
    flash("保存しました");
    await loadMonth();
    categories.value = await getCategories(true);
  } catch (caught) {
    if (!handle(caught)) {
      formError.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

async function toggleTodo(item: ScheduleItem, event: Event): Promise<void> {
  event.stopPropagation();
  if (item.kind !== "todo") {
    return;
  }
  busy.value = true;
  try {
    const result = await updateCompletion(item.id, item.is_completed !== true);
    if (result === "missing" || result === "conflict") {
      error.value = "保存できませんでした";
      return;
    }
    await loadMonth();
  } catch (caught) {
    if (!handle(caught)) {
      error.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

function askDelete(kind: "schedule" | "category" | "holiday", id: number): void {
  confirmKind.value = kind;
  confirmId.value = id;
}

async function confirmDelete(): Promise<void> {
  if (confirmKind.value === null || confirmId.value === null) {
    return;
  }
  busy.value = true;
  try {
    if (confirmKind.value === "schedule") {
      const result = await deleteSchedule(confirmId.value);
      if (result === "missing") {
        error.value = "対象がありません";
      } else {
        scheduleOpen.value = false;
        flash("削除しました");
        await loadMonth();
      }
    } else if (confirmKind.value === "category") {
      const result = await deleteCategory(confirmId.value);
      if (result === "missing") {
        error.value = "対象がありません";
      } else {
        flash("削除しました");
        categories.value = await getCategories(true);
        await loadMonth();
      }
    } else {
      const result = await deleteUserHoliday(confirmId.value);
      if (result === "missing") {
        error.value = "対象がありません";
      } else {
        holidayOpen.value = false;
        flash("削除しました");
        allUserHolidays.value = await getAllUserHolidays();
        await loadMonth();
      }
    }
  } catch (caught) {
    if (!handle(caught)) {
      error.value = "サーバエラーです";
    }
  } finally {
    confirmKind.value = null;
    confirmId.value = null;
    busy.value = false;
  }
}

function openCategoryAdd(): void {
  categoryForm.value = { id: null, name: "", color: "#4DA3FF" };
  formError.value = "";
  categoryOpen.value = true;
}

function openCategoryEdit(item: CategoryItem, event: Event): void {
  event.stopPropagation();
  categoryForm.value = { id: item.id, name: item.name, color: item.color };
  formError.value = "";
  categoryOpen.value = true;
}

async function saveCategory(): Promise<void> {
  const name = categoryForm.value.name.trim();
  if (name === "") {
    return;
  }
  busy.value = true;
  formError.value = "";
  try {
    const result =
      categoryForm.value.id === null
        ? await createCategory(name, categoryForm.value.color)
        : await updateCategory(categoryForm.value.id, name, categoryForm.value.color);
    if (result === "invalid") {
      formError.value = "入力が不正です";
      return;
    }
    if (result === "conflict") {
      formError.value = "保存できませんでした";
      return;
    }
    if (result === "missing") {
      formError.value = "対象がありません";
      return;
    }
    categoryOpen.value = false;
    flash("保存しました");
    categories.value = await getCategories(true);
  } catch (caught) {
    if (!handle(caught)) {
      formError.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

function openHolidayAdd(): void {
  holidayForm.value = {
    id: null,
    holiday_date: selectedIso.value ?? `${year.value}-${String(monthIndex.value + 1).padStart(2, "0")}-01`,
    name: "",
  };
  formError.value = "";
  holidayOpen.value = true;
}

function openHolidayEdit(item: UserHolidayItem): void {
  holidayForm.value = { id: item.id, holiday_date: item.holiday_date, name: item.name };
  formError.value = "";
  holidayOpen.value = true;
}

async function saveHoliday(): Promise<void> {
  const name = holidayForm.value.name.trim();
  if (name === "" || holidayForm.value.holiday_date === "") {
    return;
  }
  busy.value = true;
  formError.value = "";
  try {
    const result =
      holidayForm.value.id === null
        ? await createUserHoliday(holidayForm.value.holiday_date, name)
        : await updateUserHoliday(holidayForm.value.id, holidayForm.value.holiday_date, name);
    if (result === "invalid") {
      formError.value = "入力が不正です";
      return;
    }
    if (result === "conflict") {
      formError.value = "保存できませんでした";
      return;
    }
    if (result === "missing") {
      formError.value = "対象がありません";
      return;
    }
    holidayOpen.value = false;
    flash("保存しました");
    allUserHolidays.value = await getAllUserHolidays();
    await loadMonth();
  } catch (caught) {
    if (!handle(caught)) {
      formError.value = "サーバエラーです";
    }
  } finally {
    busy.value = false;
  }
}

const selectedDetail = computed(() => {
  if (selectedIso.value === null) {
    return [];
  }
  return daySchedules(selectedIso.value);
});

const selectedTone = computed(() => {
  if (selectedIso.value === null) {
    return "normal" as const;
  }
  const weekday = parseInt(selectedIso.value.slice(8), 10);
  const date = new Date(
    Number(selectedIso.value.slice(0, 4)),
    Number(selectedIso.value.slice(5, 7)) - 1,
    weekday,
  );
  return dateTone(date.getDay(), isHoliday(selectedIso.value));
});

onMounted(async () => {
  media = window.matchMedia("(max-width: 767px)");
  onMedia();
  media.addEventListener("change", onMedia);
  await loadAll();
});

onUnmounted(() => {
  media?.removeEventListener("change", onMedia);
  window.clearTimeout(successTimer);
});
</script>

<template>
  <div class="page">
    <p v-if="error" class="msg-error">{{ error }}</p>
    <p v-if="success" class="msg-success">{{ success }}</p>
    <div v-if="busy && categories.length === 0 && schedules.length === 0" class="loading">読み込み中…</div>
    <template v-else>
      <div class="toolbar">
        <h2 class="month-title">{{ titleText }}</h2>
        <button class="btn-text" type="button" :disabled="busy" @click="shiftMonth(-1)">前月</button>
        <button class="btn-text" type="button" :disabled="busy" @click="shiftMonth(1)">翌月</button>
        <button class="btn-secondary" type="button" :disabled="busy" @click="goToday">今日</button>
        <select
          class="field week-select"
          :value="prefs.week_starts_on"
          :disabled="busy"
          @change="changeWeek(($event.target as HTMLSelectElement).value)"
        >
          <option value="sunday">日曜始まり</option>
          <option value="monday">月曜始まり</option>
        </select>
        <button class="btn-secondary mobile-only" type="button" :disabled="busy" @click="categoryPanel = true">
          カテゴリ
        </button>
        <button class="btn-secondary mobile-only" type="button" :disabled="busy" @click="holidayPanel = true">
          休日
        </button>
      </div>
      <div class="body">
        <aside class="side pc-only">
          <section class="panel-block">
            <div class="section-head">
              <h3>カテゴリ</h3>
              <button class="btn-primary" type="button" :disabled="busy" @click="openCategoryAdd">新規</button>
            </div>
            <p v-if="listedCategories.length === 0" class="caption">データがありません</p>
            <ul class="plain-list">
              <li
                v-for="item in listedCategories"
                :key="item.id"
                class="cat-row"
                :class="{ muted: isHidden(item.id) }"
                @click="toggleHiddenCategory(item.id)"
              >
                <span class="swatch" :style="{ background: item.color }"></span>
                <span>{{ item.name }}{{ item.is_deleted ? "（削除済み）" : "" }}</span>
                <span class="row-actions" v-if="!item.is_deleted">
                  <button class="btn-text" type="button" @click="openCategoryEdit(item, $event)">編集</button>
                  <button class="btn-text" type="button" @click.stop="askDelete('category', item.id)">削除</button>
                </span>
              </li>
            </ul>
            <button class="btn-text" type="button" :disabled="busy" @click="toggleShowDeleted">
              {{ prefs.show_deleted ? "削除済みを隠す" : "削除済みを表示" }}
            </button>
          </section>
          <section class="panel-block">
            <div class="section-head">
              <h3>休日</h3>
              <button class="btn-primary" type="button" :disabled="busy" @click="openHolidayAdd">新規</button>
            </div>
            <p v-if="allUserHolidays.length === 0" class="caption">データがありません</p>
            <ul class="plain-list">
              <li
                v-for="item in allUserHolidays"
                :key="item.id"
                class="cat-row"
                @click="openHolidayEdit(item)"
              >
                <span>{{ item.holiday_date }} {{ item.name }}</span>
                <button class="btn-text" type="button" @click.stop="askDelete('holiday', item.id)">削除</button>
              </li>
            </ul>
          </section>
        </aside>
        <section class="calendar-wrap">
          <div class="grid">
            <div
              v-for="head in headers"
              :key="head.label"
              class="weekday"
              :class="{ 'tone-primary': head.kind === 'sat', 'tone-danger': head.kind === 'sun' }"
            >
              {{ head.label }}
            </div>
            <div
              v-for="cell in cells"
              :key="cell.iso"
              class="cell"
              :class="{ 'out-month': !cell.inMonth, selected: selectedIso === cell.iso }"
              @click="onCellClick(cell.iso)"
            >
              <div class="cell-date" :class="`tone-${tone(cell)}`">{{ Number(cell.iso.slice(8)) }}</div>
              <div v-if="holidayNames(cell.iso).length" class="holiday-names caption">
                {{ holidayNames(cell.iso).join(" ") }}
              </div>
              <template v-if="!isMobile">
                <button
                  v-for="item in daySchedules(cell.iso).slice(0, PC_VISIBLE)"
                  :key="item.id"
                  class="item-row"
                  type="button"
                  :style="{ borderLeftColor: categoryColor(item.category_id) }"
                  :class="{ done: item.kind === 'todo' && item.is_completed }"
                  @click.stop="openEdit(item)"
                >
                  <input
                    v-if="item.kind === 'todo'"
                    type="checkbox"
                    :checked="item.is_completed === true"
                    :disabled="busy"
                    @click="toggleTodo(item, $event)"
                  />
                  <span>{{ pcLabel(item, cell.iso) }}</span>
                </button>
                <div
                  v-if="daySchedules(cell.iso).length > PC_VISIBLE"
                  class="leftover caption"
                  @mouseenter="leftoverIso = cell.iso"
                  @mouseleave="leftoverIso = null"
                  @click.stop
                >
                  ＋{{ daySchedules(cell.iso).length - PC_VISIBLE }}
                  <div v-if="leftoverIso === cell.iso" class="leftover-pop">
                    <button
                      v-for="item in daySchedules(cell.iso).slice(PC_VISIBLE)"
                      :key="item.id"
                      class="item-row"
                      type="button"
                      :style="{ borderLeftColor: categoryColor(item.category_id) }"
                      :class="{ done: item.kind === 'todo' && item.is_completed }"
                      @click.stop="openEdit(item)"
                    >
                      <input
                        v-if="item.kind === 'todo'"
                        type="checkbox"
                        :checked="item.is_completed === true"
                        :disabled="busy"
                        @click="toggleTodo(item, $event)"
                      />
                      <span>{{ pcLabel(item, cell.iso) }}</span>
                    </button>
                  </div>
                </div>
              </template>
              <div v-else class="dots">
                <span v-for="(color, index) in dotsFor(cell.iso)" :key="index" class="dot" :style="{ background: color }"></span>
              </div>
            </div>
          </div>
          <div v-if="isMobile && selectedIso" class="detail">
            <h3 :class="`tone-${selectedTone}`">
              {{ selectedIso }}
              <span v-if="holidayNames(selectedIso).length" class="caption">
                {{ holidayNames(selectedIso).join(" ") }}
              </span>
            </h3>
            <p v-if="selectedDetail.length === 0" class="caption">データがありません</p>
            <button
              v-for="item in selectedDetail"
              :key="item.id"
              class="item-row"
              type="button"
              :style="{ borderLeftColor: categoryColor(item.category_id) }"
              :class="{ done: item.kind === 'todo' && item.is_completed }"
              @click="openEdit(item)"
            >
              <span>{{ item.kind === "todo" ? "TODO " : "" }}{{ mobileLabel(item, selectedIso) }}</span>
            </button>
          </div>
        </section>
      </div>
      <button v-if="isMobile" class="fab btn-primary" type="button" :disabled="busy" @click="openFab">＋</button>
    </template>

    <div v-if="categoryPanel" class="overlay" @click.self="categoryPanel = false">
      <div class="modal">
        <h2>カテゴリ</h2>
        <p v-if="listedCategories.length === 0" class="caption">データがありません</p>
        <ul class="plain-list">
          <li
            v-for="item in listedCategories"
            :key="item.id"
            class="cat-row"
            :class="{ muted: isHidden(item.id) }"
            @click="toggleHiddenCategory(item.id)"
          >
            <span class="swatch" :style="{ background: item.color }"></span>
            <span>{{ item.name }}{{ item.is_deleted ? "（削除済み）" : "" }}</span>
            <span v-if="!item.is_deleted" class="row-actions">
              <button class="btn-text" type="button" @click="openCategoryEdit(item, $event)">編集</button>
              <button class="btn-text" type="button" @click.stop="askDelete('category', item.id)">削除</button>
            </span>
          </li>
        </ul>
        <button class="btn-text" type="button" :disabled="busy" @click="toggleShowDeleted">
          {{ prefs.show_deleted ? "削除済みを隠す" : "削除済みを表示" }}
        </button>
        <div class="modal-actions">
          <button class="btn-primary" type="button" :disabled="busy" @click="openCategoryAdd">新規</button>
          <button class="btn-secondary" type="button" @click="categoryPanel = false">閉じる</button>
        </div>
      </div>
    </div>

    <div v-if="holidayPanel" class="overlay" @click.self="holidayPanel = false">
      <div class="modal">
        <h2>休日</h2>
        <p v-if="allUserHolidays.length === 0" class="caption">データがありません</p>
        <ul class="plain-list">
          <li v-for="item in allUserHolidays" :key="item.id" class="cat-row" @click="openHolidayEdit(item)">
            <span>{{ item.holiday_date }} {{ item.name }}</span>
            <button class="btn-text" type="button" @click.stop="askDelete('holiday', item.id)">削除</button>
          </li>
        </ul>
        <div class="modal-actions">
          <button class="btn-primary" type="button" :disabled="busy" @click="openHolidayAdd">新規</button>
          <button class="btn-secondary" type="button" @click="holidayPanel = false">閉じる</button>
        </div>
      </div>
    </div>

    <div v-if="scheduleOpen" class="overlay" @click.self="scheduleOpen = false">
      <div class="modal">
        <h2>{{ scheduleForm.id === null ? "新規" : "編集" }}</h2>
        <p v-if="formError" class="msg-error">{{ formError }}</p>
        <div class="form-grid">
          <select v-model="scheduleForm.kind" class="field" :disabled="busy">
            <option value="event">予定</option>
            <option value="todo">TODO</option>
          </select>
          <select v-model="scheduleForm.granularity" class="field" :disabled="busy">
            <option value="day">日単位</option>
            <option value="time">時間単位</option>
          </select>
          <input v-model="scheduleForm.title" class="field" placeholder="タイトル" :disabled="busy" />
          <input v-model="scheduleForm.start_date" class="field" type="date" :disabled="busy" />
          <input
            v-if="scheduleForm.granularity === 'time'"
            v-model="scheduleForm.start_time"
            class="field"
            type="time"
            :disabled="busy"
          />
          <input v-model="scheduleForm.end_date" class="field" type="date" :disabled="busy" />
          <input
            v-if="scheduleForm.granularity === 'time'"
            v-model="scheduleForm.end_time"
            class="field"
            type="time"
            :disabled="busy"
          />
          <select v-model="scheduleForm.category_id" class="field" :disabled="busy">
            <option :value="null">カテゴリ</option>
            <option v-for="item in activeCategories" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
          <input v-model="scheduleForm.location" class="field" placeholder="場所" :disabled="busy" />
          <textarea v-model="scheduleForm.detail" class="field" placeholder="詳細" :disabled="busy"></textarea>
          <select
            v-if="scheduleForm.id !== null && scheduleForm.kind === 'todo'"
            v-model="scheduleForm.is_completed"
            class="field"
            :disabled="busy"
          >
            <option :value="false">未実施</option>
            <option :value="true">実施済み</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" type="button" :disabled="busy" @click="saveSchedule">保存</button>
          <button class="btn-secondary" type="button" :disabled="busy" @click="scheduleOpen = false">キャンセル</button>
          <button
            v-if="scheduleForm.id !== null"
            class="btn-text"
            type="button"
            :disabled="busy"
            @click="askDelete('schedule', scheduleForm.id)"
          >
            削除
          </button>
        </div>
      </div>
    </div>

    <div v-if="categoryOpen" class="overlay" @click.self="categoryOpen = false">
      <div class="modal">
        <h2>{{ categoryForm.id === null ? "新規" : "編集" }}</h2>
        <p v-if="formError" class="msg-error">{{ formError }}</p>
        <div class="form-grid">
          <input v-model="categoryForm.name" class="field" placeholder="名称" :disabled="busy" />
          <input v-model="categoryForm.color" class="field" type="color" :disabled="busy" />
        </div>
        <div class="modal-actions">
          <button class="btn-primary" type="button" :disabled="busy" @click="saveCategory">保存</button>
          <button class="btn-secondary" type="button" :disabled="busy" @click="categoryOpen = false">キャンセル</button>
        </div>
      </div>
    </div>

    <div v-if="holidayOpen" class="overlay" @click.self="holidayOpen = false">
      <div class="modal">
        <h2>{{ holidayForm.id === null ? "新規" : "編集" }}</h2>
        <p v-if="formError" class="msg-error">{{ formError }}</p>
        <div class="form-grid">
          <input v-model="holidayForm.holiday_date" class="field" type="date" :disabled="busy" />
          <input v-model="holidayForm.name" class="field" placeholder="名称" :disabled="busy" />
        </div>
        <div class="modal-actions">
          <button class="btn-primary" type="button" :disabled="busy" @click="saveHoliday">保存</button>
          <button class="btn-secondary" type="button" :disabled="busy" @click="holidayOpen = false">キャンセル</button>
          <button
            v-if="holidayForm.id !== null"
            class="btn-text"
            type="button"
            :disabled="busy"
            @click="askDelete('holiday', holidayForm.id)"
          >
            削除
          </button>
        </div>
      </div>
    </div>

    <div v-if="confirmKind" class="overlay">
      <div class="modal">
        <h2>削除</h2>
        <p>削除しますか？</p>
        <div class="modal-actions">
          <button class="btn-primary" type="button" :disabled="busy" @click="confirmDelete">削除</button>
          <button class="btn-secondary" type="button" :disabled="busy" @click="confirmKind = null">キャンセル</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(var(--space) * 3);
  min-height: 0;
  position: relative;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space);
  margin-bottom: calc(var(--space) * 2);
}

.month-title {
  margin: 0;
  font-size: var(--font-size-title);
}

.week-select {
  width: auto;
  min-width: 160px;
}

.body {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: calc(var(--space) * 2);
  min-height: 0;
}

.side,
.calendar-wrap,
.detail,
.plain-list {
  min-height: 0;
}

.side {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: calc(var(--space) * 3);
}

.calendar-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: auto repeat(6, minmax(0, 1fr));
  border: 1px solid var(--color-border);
  min-height: 0;
}

.weekday,
.cell {
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space);
}

.weekday {
  background: var(--color-surface);
  text-align: center;
}

.cell {
  position: relative;
  overflow: hidden;
  background: var(--color-surface);
}

.cell.out-month {
  opacity: 0.55;
}

.cell.selected {
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.cell-date {
  font-weight: 600;
}

.holiday-names {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-row {
  display: flex;
  align-items: center;
  gap: var(--space);
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  border-left: 4px solid var(--color-primary);
  padding: 2px var(--space);
  color: var(--color-text);
  min-height: 24px;
}

.item-row.done span {
  text-decoration: line-through;
}

.leftover {
  position: absolute;
  right: var(--space);
  bottom: var(--space);
}

.leftover-pop {
  position: absolute;
  right: 0;
  bottom: 24px;
  width: 220px;
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius);
  padding: var(--space);
  z-index: 5;
}

.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: var(--space);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.detail {
  max-height: 36%;
  overflow: auto;
  margin-top: calc(var(--space) * 2);
  padding-top: var(--space);
  border-top: 1px solid var(--color-border);
}

.fab {
  position: absolute;
  right: calc(var(--space) * 3);
  bottom: calc(var(--space) * 3);
  width: var(--tap);
  height: var(--tap);
  border-radius: 50%;
  padding: 0;
  z-index: 6;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space);
  margin-bottom: var(--space);
}

.section-head h3,
.detail h3 {
  margin: 0;
}

.plain-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: var(--space);
  min-height: var(--tap);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.row-actions {
  margin-left: auto;
  display: flex;
}

.swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex: none;
}

.tone-primary {
  color: var(--color-primary);
}

.tone-danger {
  color: var(--color-danger);
}

.mobile-only {
  display: none;
}

@media (max-width: 767px) {
  .pc-only {
    display: none;
  }

  .mobile-only {
    display: inline-flex;
  }

  .body {
    grid-template-columns: 1fr;
  }

  .fab {
    bottom: calc(var(--space) * 2);
  }
}
</style>
