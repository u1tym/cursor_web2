import { ref } from "vue";

export const calendarNavBusy = ref(false);

type CalendarNavHandlers = {
  goToday: () => void;
};

let handlers: CalendarNavHandlers | null = null;

export function setCalendarNavHandlers(next: CalendarNavHandlers | null): void {
  handlers = next;
}

export function goTodayNav(): void {
  handlers?.goToday();
}
