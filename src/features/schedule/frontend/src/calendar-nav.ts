import { ref } from "vue";
import type { WeekStart } from "./calendar";

export const weekStartsOn = ref<WeekStart>("sunday");
export const calendarNavBusy = ref(false);

type CalendarNavHandlers = {
  goToday: () => void;
  changeWeek: (value: WeekStart) => void;
};

let handlers: CalendarNavHandlers | null = null;

export function setCalendarNavHandlers(next: CalendarNavHandlers | null): void {
  handlers = next;
}

export function goTodayNav(): void {
  handlers?.goToday();
}

export function changeWeekNav(value: WeekStart): void {
  handlers?.changeWeek(value);
}
