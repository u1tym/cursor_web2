export type WeekStart = "sunday" | "monday";

export type DayCell = {
  iso: string;
  inMonth: boolean;
  weekday: number;
};

export function toIso(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${year}年${monthIndex + 1}月`;
}

export function addMonths(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function weekdayHeaders(weekStartsOn: WeekStart): { label: string; kind: "sat" | "sun" | "other" }[] {
  const names =
    weekStartsOn === "sunday"
      ? ["日", "月", "火", "水", "木", "金", "土"]
      : ["月", "火", "水", "木", "金", "土", "日"];
  return names.map((label) => ({
    label,
    kind: label === "土" ? "sat" : label === "日" ? "sun" : "other",
  }));
}

export function monthCells(year: number, monthIndex: number, weekStartsOn: WeekStart): DayCell[] {
  const first = new Date(year, monthIndex, 1);
  const dow = first.getDay();
  const offset = weekStartsOn === "sunday" ? dow : (dow + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);
  const cells: DayCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    cells.push({
      iso: toIso(current),
      inMonth: current.getMonth() === monthIndex,
      weekday: current.getDay(),
    });
  }
  return cells;
}

export function dateTone(weekday: number, isHoliday: boolean): "danger" | "primary" | "normal" {
  if (isHoliday || weekday === 0) {
    return "danger";
  }
  if (weekday === 6) {
    return "primary";
  }
  return "normal";
}

export function overlapsDay(startDate: string, endDate: string, iso: string): boolean {
  return startDate <= iso && endDate >= iso;
}
